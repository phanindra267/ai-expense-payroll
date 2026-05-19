import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Expense from '../models/Expense';
import Payroll from '../models/Payroll';
import Alert from '../models/Alert';
import Budget from '../models/Budget';

// ─── Dashboard Summary ────────────────────────────────────────────────────────
export async function getDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.user!.organisationId;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Last 6 months for trend
    const trend: { month: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const [agg] = await Expense.aggregate([
        { $match: { organisationId: orgId, date: { $gte: d, $lt: end } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      trend.push({ month: m, total: agg?.total || 0 });
    }

    // Category breakdown current month
    const categoryBreakdown = await Expense.aggregate([
      { $match: { organisationId: orgId, date: { $gte: monthStart, $lt: monthEnd } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    // Total expenses this month
    const [monthExpAgg] = await Expense.aggregate([
      { $match: { organisationId: orgId, date: { $gte: monthStart, $lt: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    // Payroll cost this month
    const [payrollAgg] = await Payroll.aggregate([
      { $match: { organisationId: orgId, month } },
      { $group: { _id: null, total: { $sum: '$netPay' } } },
    ]);

    // Anomalies
    const anomalies = await Expense.find({ organisationId: orgId, flagged: true }).sort({ date: -1 }).limit(5).lean();

    // Alerts
    const alerts = await Alert.find({ organisationId: orgId, resolved: false }).sort({ createdAt: -1 }).limit(10).lean();

    // Budget health score (0-100): average % remaining across all budgets
    const budgets = await Budget.find({ organisationId: orgId, month }).lean();
    let healthScore = 100;
    if (budgets.length > 0) {
      const avgPct = budgets.reduce((s, b) => s + Math.min(b.spentSoFar / (b.limit || 1), 1), 0) / budgets.length;
      healthScore = Math.max(0, Math.round((1 - avgPct) * 100));
    }

    res.json({
      summary: {
        totalExpenses: monthExpAgg?.total || 0,
        expenseCount: monthExpAgg?.count || 0,
        payrollCost: payrollAgg?.total || 0,
        healthScore,
        activeAlerts: alerts.length,
      },
      trend,
      categoryBreakdown: categoryBreakdown.map(c => ({ category: c._id, total: c.total, count: c.count })),
      recentAnomalies: anomalies,
      alerts,
    });
  } catch (err) { next(err); }
}
