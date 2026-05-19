import { Response, NextFunction } from 'express';
import { createObjectCsvStringifier } from 'csv-writer';
import { AuthRequest } from '../middleware/auth';
import Expense from '../models/Expense';
import { AppError } from '../middleware/errorHandler';

// ─── Monthly CSV ─────────────────────────────────────────────────────────────
export async function exportMonthlyCSV(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month } = req.query as { month?: string };
    if (!month) throw new AppError('month query param required (YYYY-MM)', 400, 'VALIDATION_ERROR');

    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 1);

    const expenses = await Expense.find({
      organisationId: req.user!.organisationId,
      date: { $gte: start, $lt: end },
    }).lean();

    const csv = createObjectCsvStringifier({
      header: [
        { id: 'date', title: 'Date' },
        { id: 'description', title: 'Description' },
        { id: 'vendor', title: 'Vendor' },
        { id: 'category', title: 'Category' },
        { id: 'paymentMethod', title: 'Payment Method' },
        { id: 'amount', title: 'Amount (₹)' },
        { id: 'flagged', title: 'Flagged' },
      ],
    });

    const records = expenses.map(e => ({
      date: e.date.toISOString().split('T')[0],
      description: e.description,
      vendor: e.vendor || '',
      category: e.category,
      paymentMethod: e.paymentMethod || '',
      amount: e.amount.toFixed(2),
      flagged: e.flagged ? 'YES' : 'NO',
    }));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=expenses-${month}.csv`);
    res.send(csv.getHeaderString() + csv.stringifyRecords(records));
  } catch (err) { next(err); }
}

// ─── Yearly CSV ──────────────────────────────────────────────────────────────
export async function exportYearlyCSV(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { year } = req.query as { year?: string };
    if (!year) throw new AppError('year query param required (YYYY)', 400, 'VALIDATION_ERROR');

    const start = new Date(parseInt(year), 0, 1);
    const end = new Date(parseInt(year) + 1, 0, 1);

    const expenses = await Expense.find({
      organisationId: req.user!.organisationId,
      date: { $gte: start, $lt: end },
    }).lean();

    const csv = createObjectCsvStringifier({
      header: [
        { id: 'month', title: 'Month' },
        { id: 'date', title: 'Date' },
        { id: 'description', title: 'Description' },
        { id: 'category', title: 'Category' },
        { id: 'amount', title: 'Amount (₹)' },
        { id: 'flagged', title: 'Flagged' },
      ],
    });

    const records = expenses.map(e => {
      const d = e.date;
      return {
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        date: d.toISOString().split('T')[0],
        description: e.description,
        category: e.category,
        amount: e.amount.toFixed(2),
        flagged: e.flagged ? 'YES' : 'NO',
      };
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=expenses-${year}.csv`);
    res.send(csv.getHeaderString() + csv.stringifyRecords(records));
  } catch (err) { next(err); }
}
