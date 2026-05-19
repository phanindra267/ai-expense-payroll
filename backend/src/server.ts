import './prestart';
import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import IORedis from 'ioredis';
import app from './app';
import { initWebSocket } from './services/websocket.service';
import { categorizationWorker } from './services/queue/categorisation.queue';
import { anomalyWorker } from './services/queue/anomaly.queue';
import { notificationWorker } from './services/queue/notification.queue';
import logger from './utils/logger';
import { initTelemetry } from './services/telemetry.service';

const PORT = parseInt(process.env.PORT || '3000', 10);
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-payroll';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function bootstrap() {
  // Init telemetry
  initTelemetry();

  // MongoDB with dynamic MongoMemoryServer fallback in development
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    logger.info('MongoDB connected', { uri: MONGO_URI.replace(/\/\/.*@/, '//***@') });
  } catch (err) {
    logger.warn('Failed to connect to primary MongoDB. Starting local MongoMemoryServer fallback...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const fallbackUri = mongoServer.getUri();
      await mongoose.connect(fallbackUri);
      logger.info('MongoMemoryServer started and connected successfully', { uri: fallbackUri });
    } catch (fallbackErr: any) {
      logger.error('Failed to start MongoMemoryServer fallback', { err: fallbackErr.message });
      throw err;
    }
  }

  // Redis ping with safe error catching
  try {
    const redis = new IORedis(REDIS_URL, { maxRetriesPerRequest: null, connectTimeout: 2000 });
    await redis.ping();
    logger.info('Redis connected');
    await redis.disconnect();
  } catch (err) {
    logger.warn('Redis connection refused on startup. Continuing without Redis (BullMQ queues will be offline).');
  }

  // HTTP + Socket.io
  const httpServer = http.createServer(app);
  initWebSocket(httpServer);

  // Start BullMQ workers (already instantiated by import, just log)
  logger.info('Queue workers started', {
    workers: ['categorization', 'anomaly', 'notification'],
  });

  httpServer.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`, { port: PORT, env: process.env.NODE_ENV });
  });

  // ─── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    httpServer.close(() => logger.info('HTTP server closed'));

    await Promise.allSettled([
      categorizationWorker.close(),
      anomalyWorker.close(),
      notificationWorker.close(),
    ]);
    await mongoose.disconnect();
    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { err: err.message, stack: err.stack });
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
  });
}

bootstrap().catch(err => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
