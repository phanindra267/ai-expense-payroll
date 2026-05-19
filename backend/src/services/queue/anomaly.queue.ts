import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import Expense from '../../models/Expense';
import Alert from '../../models/Alert';
import JobLog from '../../models/JobLog';
import logger from '../../utils/logger';
import { activeJobs } from '../../utils/metrics';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
connection.on('error', () => {});

const LOOKBACK_MONTHS = 3;
const Z_SCORE_THRESHOLD = 2.5;

// ─── Queue ────────────────────────────────────────────────────────────────────
export const anomalyQueue = new Queue('anomaly', { connection });

// ─── Worker ───────────────────────────────────────────────────────────────────
export const anomalyWorker = new Worker(
  'anomaly',
  async (job: Job) => {
    const { expenseId, orgId, category, amount } = job.data;
    activeJobs.inc();

    const existing = await JobLog.findOne({ jobId: job.id, status: 'completed' });
    if (existing) { activeJobs.dec(); return existing.result; }

    // Get last N months of same-category expenses for this org
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - LOOKBACK_MONTHS);
    const historicalExpenses = await Expense.find({
      organisationId: orgId, category,
      date: { $gte: cutoff },
      _id: { $ne: expenseId },
    }).lean();

    let flagged = false;
    let anomalyReason = '';

    if (historicalExpenses.length >= 5) {
      const amounts = historicalExpenses.map(e => e.amount);
      const mean = amounts.reduce((s: number, v: number) => s + v, 0) / amounts.length;
      const variance = amounts.reduce((s: number, v: number) => s + Math.pow(v - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      const zScore = stdDev > 0 ? Math.abs((amount - mean) / stdDev) : 0;

      if (zScore > Z_SCORE_THRESHOLD) {
        flagged = true;
        anomalyReason = `Z-score ${zScore.toFixed(2)} exceeds threshold ${Z_SCORE_THRESHOLD}. Mean: ₹${mean.toFixed(2)}, StdDev: ₹${stdDev.toFixed(2)}`;
        await Alert.create({
          type: 'anomaly',
          message: `Anomalous expense detected in ${category}: ₹${amount} (Z=${zScore.toFixed(2)})`,
          category, organisationId: orgId,
        });
      }
    }

    await Expense.findByIdAndUpdate(expenseId, { flagged, anomalyReason });
    await JobLog.findOneAndUpdate(
      { jobId: job.id },
      { jobId: job.id, queue: 'anomaly', status: 'completed', result: { flagged, anomalyReason }, attempts: job.attemptsMade + 1 },
      { upsert: true }
    );

    activeJobs.dec();
    return { flagged, anomalyReason };
  },
  { connection, concurrency: 5 }
);

anomalyWorker.on('failed', async (job, err) => {
  if (job) {
    await JobLog.findOneAndUpdate(
      { jobId: job.id },
      { jobId: job.id, queue: 'anomaly', status: 'failed', error: err.message, attempts: job.attemptsMade },
      { upsert: true }
    );
  }
  logger.error('Anomaly detection job failed', { jobId: job?.id, err: err.message });
  activeJobs.dec();
});
