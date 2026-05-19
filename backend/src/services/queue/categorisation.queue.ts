import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import Expense from '../../models/Expense';
import JobLog from '../../models/JobLog';
import logger from '../../utils/logger';
import { activeJobs } from '../../utils/metrics';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
connection.on('error', () => {});

// ─── Default categories by keyword ───────────────────────────────────────────
const CATEGORY_RULES: [RegExp, string][] = [
  [/hotel|stay|accommodation|lodging/i, 'Travel & Accommodation'],
  [/flight|airline|train|bus|transport|uber|ola|cab/i, 'Transport'],
  [/food|restaurant|meal|lunch|dinner|breakfast|cafe|coffee/i, 'Meals & Entertainment'],
  [/software|subscription|saas|license|cloud|aws|azure/i, 'Software & Subscriptions'],
  [/office|stationery|supplies|paper|pen|printer/i, 'Office Supplies'],
  [/salary|wage|payroll/i, 'Payroll'],
  [/tax|gst|vat|duty/i, 'Taxes & Duties'],
  [/marketing|ads|advertis|seo|social/i, 'Marketing'],
  [/legal|lawyer|attorney|compliance/i, 'Legal & Compliance'],
  [/medical|health|insurance|clinic/i, 'Healthcare'],
];

function ruleBasedCategory(description: string): string {
  for (const [regex, category] of CATEGORY_RULES) {
    if (regex.test(description)) return category;
  }
  return 'General';
}

async function tryOllamaCategory(description: string, amount: number): Promise<string | null> {
  try {
    const response = await fetch(`${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'llama3',
        prompt: `Classify this expense into exactly one category. Respond with only the category name, nothing else.\nExpense: "${description}" Amount: ${amount}\nCategories: Travel & Accommodation, Transport, Meals & Entertainment, Software & Subscriptions, Office Supplies, Payroll, Taxes & Duties, Marketing, Legal & Compliance, Healthcare, General`,
        stream: false,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json() as any;
    const cat = data.response?.trim();
    return cat || null;
  } catch {
    return null;
  }
}

// ─── Queue ────────────────────────────────────────────────────────────────────
export const categorizationQueue = new Queue('categorization', { connection });

// ─── Worker ───────────────────────────────────────────────────────────────────
export const categorizationWorker = new Worker(
  'categorization',
  async (job: Job) => {
    const { expenseId, description, amount } = job.data;
    activeJobs.inc();

    // Duplicate guard
    const existing = await JobLog.findOne({ jobId: job.id });
    if (existing?.status === 'completed') {
      logger.info('Categorization job already completed (duplicate)', { jobId: job.id });
      activeJobs.dec();
      return existing.result;
    }

    // Try Ollama first, fall back to rules
    let category = await tryOllamaCategory(description, amount);
    if (!category) {
      category = ruleBasedCategory(description);
      logger.info('Using rule-based categorization', { expenseId });
    }

    await Expense.findByIdAndUpdate(expenseId, { category });
    await JobLog.findOneAndUpdate(
      { jobId: job.id },
      { jobId: job.id, queue: 'categorization', status: 'completed', result: { category }, attempts: job.attemptsMade + 1 },
      { upsert: true }
    );

    activeJobs.dec();
    return { category };
  },
  { connection, concurrency: 5 }
);

categorizationWorker.on('failed', async (job, err) => {
  if (job) {
    await JobLog.findOneAndUpdate(
      { jobId: job.id },
      { jobId: job.id, queue: 'categorization', status: 'failed', error: err.message, attempts: job.attemptsMade },
      { upsert: true }
    );
  }
  logger.error('Categorization job failed', { jobId: job?.id, err: err.message });
  activeJobs.dec();
});
