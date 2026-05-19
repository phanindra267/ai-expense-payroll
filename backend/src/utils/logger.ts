import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  requestId: string;
  userId?: string;
  organisationId?: string;
}

export const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

const formatWithContext = winston.format((info) => {
  const context = asyncLocalStorage.getStore();
  if (context) {
    info.requestId = context.requestId;
    if (context.userId) info.userId = context.userId;
    if (context.organisationId) info.organisationId = context.organisationId;
  }
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    formatWithContext(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, requestId, userId, organisationId, ...meta }) => {
            let prefix = `${timestamp} [${level}]`;
            if (requestId) prefix += ` [${requestId}]`;
            if (userId) prefix += ` [user:${userId}]`;
            if (organisationId) prefix += ` [org:${organisationId}]`;
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${prefix} ${message}${metaStr}`;
          })
        )
  ),
  transports: [
    new winston.transports.Console(),
  ],
  defaultMeta: { service: 'expense-payroll-api' },
});

if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error', maxsize: 10485760, maxFiles: 5 })
  );
  logger.add(
    new winston.transports.File({ filename: 'logs/combined.log', maxsize: 10485760, maxFiles: 5 })
  );
}

export default logger;
