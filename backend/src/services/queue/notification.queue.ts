import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import nodemailer from 'nodemailer';
import logger from '../../utils/logger';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
connection.on('error', () => {});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendSlack(webhookUrl: string, message: string): Promise<void> {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });
}

// ─── Queue ────────────────────────────────────────────────────────────────────
export const notificationQueue = new Queue('notification', { connection });

// ─── Worker ───────────────────────────────────────────────────────────────────
export const notificationWorker = new Worker(
  'notification',
  async (job: Job) => {
    const { type, to, subject, message, slackWebhook } = job.data;

    if (type === 'email' && to && process.env.SMTP_USER) {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to,
        subject: subject || 'Notification from Expense Manager',
        html: `<p>${message}</p>`,
      });
      logger.info('Email notification sent', { to, subject });
    }

    if (type === 'slack' && slackWebhook) {
      await sendSlack(slackWebhook, message);
      logger.info('Slack notification sent');
    }

    if (type === 'both') {
      if (to && process.env.SMTP_USER) {
        await transporter.sendMail({ from: process.env.SMTP_USER, to, subject, html: `<p>${message}</p>` });
      }
      if (slackWebhook || process.env.SLACK_WEBHOOK_URL) {
        await sendSlack(slackWebhook || process.env.SLACK_WEBHOOK_URL!, message);
      }
    }
  },
  { connection, concurrency: 3 }
);

notificationWorker.on('failed', (job, err) => {
  logger.error('Notification job failed', { jobId: job?.id, err: err.message });
});
