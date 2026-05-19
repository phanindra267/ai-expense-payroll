import Expense from '../../models/Expense';
import Budget from '../../models/Budget';
import Payroll from '../../models/Payroll';
import { anonymiseData } from '../../utils/anonymise';
import { checkToolRateLimit } from './safetyFilter';

// ─── Tool definitions ─────────────────────────────────────────────────────────
export interface AgentTool {
  name: string;
  description: string;
  execute: (args: any, context: { orgId: string; userId: string }) => Promise<any>;
}

export const agentTools: AgentTool[] = [
  {
    name: 'fetch_expenses',
    description: 'Fetch expenses for a given month and optional category. Args: { month: "YYYY-MM", category?: string }',
    execute: async ({ month, category }, { orgId, userId }) => {
      const { allowed, retryAfter } = await checkToolRateLimit('fetch_expenses', userId);
      if (!allowed) throw new Error(`Rate limit exceeded. Retry after ${retryAfter}s`);

      const [year, mon] = (month || '').split('-').map(Number);
      if (!year || !mon) throw new Error('Invalid month format. Use YYYY-MM');
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 1);
      const filter: any = { organisationId: orgId, date: { $gte: start, $lt: end } };
      if (category) filter.category = category;

      const expenses = await Expense.find(filter).limit(50).lean();
      return anonymiseData(expenses.map(e => ({
        id: e._id, description: e.description, amount: e.amount,
        category: e.category, date: e.date, flagged: e.flagged, vendor: e.vendor,
      })));
    },
  },
  {
    name: 'check_budget',
    description: 'Check budget status for a category and month. Args: { category: string, month: "YYYY-MM" }',
    execute: async ({ category, month }, { orgId, userId }) => {
      const { allowed, retryAfter } = await checkToolRateLimit('check_budget', userId);
      if (!allowed) throw new Error(`Rate limit exceeded. Retry after ${retryAfter}s`);

      const budget = await Budget.findOne({ organisationId: orgId, category, month });
      if (!budget) return { message: 'No budget set for this category and month' };
      const percentUsed = budget.limit > 0 ? Math.round((budget.spentSoFar / budget.limit) * 100) : 0;
      return {
        category: budget.category, month, limit: budget.limit,
        spent: budget.spentSoFar, percentUsed,
        status: percentUsed >= 100 ? 'critical' : percentUsed >= 80 ? 'warning' : 'ok',
      };
    },
  },
  {
    name: 'get_health_score',
    description: 'Calculate financial health score (0-100) for the current month. Args: {}',
    execute: async (_args, { orgId, userId }) => {
      const { allowed, retryAfter } = await checkToolRateLimit('get_health_score', userId);
      if (!allowed) throw new Error(`Rate limit exceeded. Retry after ${retryAfter}s`);

      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const budgets = await Budget.find({ organisationId: orgId, month }).lean();
      const anomalyCount = await Expense.countDocuments({ organisationId: orgId, flagged: true,
        date: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } });

      let score = 100;
      if (budgets.length > 0) {
        const avgPct = budgets.reduce((s: any, b: any) => s + Math.min(b.spentSoFar / (b.limit || 1), 1), 0) / budgets.length;
        score -= Math.round(avgPct * 40); // up to 40 pts deduction for budget overrun
      }
      score -= Math.min(anomalyCount * 5, 30); // up to 30 pts for anomalies
      score = Math.max(0, score);

      return { score, month, budgetsChecked: budgets.length, anomaliesDetected: anomalyCount,
        interpretation: score >= 80 ? 'Healthy' : score >= 60 ? 'Moderate Risk' : 'High Risk' };
    },
  },
];

export function getToolByName(name: string): AgentTool | undefined {
  return agentTools.find(t => t.name === name);
}
