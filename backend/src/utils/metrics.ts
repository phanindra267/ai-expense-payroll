import client, { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

const register = new Registry();

collectDefaultMetrics({ register });

// HTTP request duration histogram
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  registers: [register],
});

// Active BullMQ jobs gauge
export const activeJobs = new Gauge({
  name: 'active_jobs',
  help: 'Number of currently active BullMQ jobs',
  labelNames: ['queue'],
  registers: [register],
});

// AI safety rejections counter
export const aiSafetyRejections = new Counter({
  name: 'ai_safety_rejections_total',
  help: 'Total number of AI safety filter rejections',
  labelNames: ['reason'],
  registers: [register],
});

// Queue duplicate jobs counter
export const queueDuplicateJobs = new Counter({
  name: 'queue_duplicate_jobs_total',
  help: 'Total number of duplicate jobs prevented',
  labelNames: ['queue'],
  registers: [register],
});

// Auth events counter
export const authEvents = new Counter({
  name: 'auth_events_total',
  help: 'Total authentication events',
  labelNames: ['event'],
  registers: [register],
});

// Expense creation counter
export const expenseCounter = new Counter({
  name: 'expenses_created_total',
  help: 'Total expenses created',
  registers: [register],
});

// Payroll processing duration
export const payrollProcessingDuration = new Histogram({
  name: 'payroll_processing_duration_ms',
  help: 'Duration of payroll processing in milliseconds',
  buckets: [100, 500, 1000, 5000, 10000, 30000],
  registers: [register],
});

// WebSocket connections gauge
export const wsConnections = new Gauge({
  name: 'websocket_connections',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

export { register };
export default client;
