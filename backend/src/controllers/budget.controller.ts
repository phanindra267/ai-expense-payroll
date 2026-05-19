import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Budget from '../models/Budget';
import { AppError } from '../middleware/errorHandler';

// ─── Set / Update Budget ─────────────────────────────────────────────────────
export async function setBudget(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { category, month, limit } = req.body;
    if (!category || !month || limit === undefined) {
      throw new AppError('category, month and limit are required', 400, 'VALIDATION_ERROR');
    }
    const budget = await Budget.findOneAndUpdate(
      { organisationId: req.user!.organisationId, category, month },
      { $set: { limit } },
      { upsert: true, new: true, runValidators: true }
    );
    res.status(200).json(budget);
  } catch (err) { next(err); }
}

// ─── List Budgets ────────────────────────────────────────────────────────────
export async function listBudgets(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month } = req.query as { month?: string };
    const filter: any = { organisationId: req.user!.organisationId };
    if (month) filter.month = month;

    const budgets = await Budget.find(filter).lean();
    const enriched = budgets.map(b => ({
      ...b,
      percentUsed: b.limit > 0 ? Math.round((b.spentSoFar / b.limit) * 100) : 0,
      status: b.spentSoFar >= b.limit ? 'critical' : b.spentSoFar >= b.limit * 0.8 ? 'warning' : 'ok',
    }));
    res.json(enriched);
  } catch (err) { next(err); }
}

// ─── Get Budget ───────────────────────────────────────────────────────────────
export async function getBudget(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const budget = await Budget.findOne({
      _id: req.params.id, organisationId: req.user!.organisationId,
    });
    if (!budget) throw new AppError('Budget not found', 404, 'NOT_FOUND');
    res.json({
      ...budget.toObject(),
      percentUsed: budget.limit > 0 ? Math.round((budget.spentSoFar / budget.limit) * 100) : 0,
    });
  } catch (err) { next(err); }
}

// ─── Delete Budget ────────────────────────────────────────────────────────────
export async function deleteBudget(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const b = await Budget.findOneAndDelete({ _id: req.params.id, organisationId: req.user!.organisationId });
    if (!b) throw new AppError('Budget not found', 404, 'NOT_FOUND');
    res.json({ message: 'Budget deleted' });
  } catch (err) { next(err); }
}
