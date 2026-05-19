import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import { AuthRequest } from '../middleware/auth';
import Expense from '../models/Expense';
import Budget from '../models/Budget';
import Alert from '../models/Alert';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { categorizationQueue } from '../services/queue/categorisation.queue';
import { anomalyQueue } from '../services/queue/anomaly.queue';
import { kafkaProducer } from '../services/kafka/producer';

// ─── Multer setup ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: 'uploads/receipts',
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
export const uploadReceipt = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── List Expenses ────────────────────────────────────────────────────────────
export async function listExpenses(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.user!.organisationId;
    const { month, category, flagged, page = '1', limit = '20', search } = req.query as Record<string, string>;
    const filter: any = { organisationId: orgId };

    if (month) {
      const [year, mon] = month.split('-').map(Number);
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 1);
      filter.date = { $gte: start, $lt: end };
    }
    if (category) filter.category = category;
    if (flagged !== undefined) filter.flagged = flagged === 'true';
    if (search) filter.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [expenses, total] = await Promise.all([
      Expense.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Expense.countDocuments(filter),
    ]);

    res.json({ data: expenses, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
}

// ─── Get One ──────────────────────────────────────────────────────────────────
export async function getExpense(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, organisationId: req.user!.organisationId });
    if (!expense) throw new AppError('Expense not found', 404, 'NOT_FOUND');
    res.json(expense);
  } catch (err) { next(err); }
}

// ─── Create ───────────────────────────────────────────────────────────────────
export async function createExpense(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.user!.organisationId;
    const { description, amount, date, vendor, paymentMethod, category } = req.body;
    if (!description || amount === undefined || !date) {
      throw new AppError('description, amount and date are required', 400, 'VALIDATION_ERROR');
    }

    const receiptPath = (req as any).file?.path;

    let mappedPaymentMethod = 'other';
    if (paymentMethod) {
      const normalized = paymentMethod.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const validMethods = ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'upi', 'other'];
      if (validMethods.includes(normalized)) {
        mappedPaymentMethod = normalized;
      }
    }

    const expense = await Expense.create({
      description, amount: parseFloat(amount), date: new Date(date),
      vendor: vendor || 'Unknown Vendor',
      paymentMethod: mappedPaymentMethod as any,
      category: category || 'Uncategorized',
      receipt: receiptPath, organisationId: orgId,
      createdBy: req.user!.userId,
    });

    // 5. Emit Event via Kafka
    await kafkaProducer.publishEvent('finai.expenses', 'ExpenseCreated', {
      expenseId: expense._id,
      organisationId: req.user!.organisationId,
      amount: expense.amount
    });

    // Queue AI jobs
    await categorizationQueue.add('categorize', { expenseId: String(expense._id), description, amount }, {
      jobId: `cat-${expense._id}`, attempts: 3, backoff: { type: 'exponential', delay: 2000 },
    });
    await anomalyQueue.add('detect', { expenseId: String(expense._id), orgId, category: expense.category, amount: expense.amount }, {
      jobId: `anomaly-${expense._id}`, attempts: 3, backoff: { type: 'exponential', delay: 2000 },
    });

    // Budget check
    const month = `${new Date(date).getFullYear()}-${String(new Date(date).getMonth() + 1).padStart(2, '0')}`;
    const budget = await Budget.findOne({ organisationId: orgId, category: expense.category, month });
    if (budget) {
      budget.spentSoFar += expense.amount;
      await budget.save();
      const pct = budget.spentSoFar / budget.limit;
      if (pct >= 1) {
        await Alert.create({ type: 'budget_critical', message: `Budget for ${expense.category} exceeded`, category: expense.category, month, organisationId: orgId });
      } else if (pct >= 0.8) {
        await Alert.create({ type: 'budget_warning', message: `Budget for ${expense.category} is at ${Math.round(pct * 100)}%`, category: expense.category, month, organisationId: orgId });
      }
    }

    logger.info('Expense created', { expenseId: expense._id, orgId });
    res.status(201).json(expense);
  } catch (err) { next(err); }
}

// ─── Update ───────────────────────────────────────────────────────────────────
export async function updateExpense(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, organisationId: req.user!.organisationId },
      { $set: req.body }, { new: true, runValidators: true }
    );
    if (!expense) throw new AppError('Expense not found', 404, 'NOT_FOUND');
    res.json(expense);
  } catch (err) { next(err); }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export async function deleteExpense(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const e = await Expense.findOneAndDelete({ _id: req.params.id, organisationId: req.user!.organisationId });
    if (!e) throw new AppError('Expense not found', 404, 'NOT_FOUND');
    res.json({ message: 'Expense deleted' });
  } catch (err) { next(err); }
}
