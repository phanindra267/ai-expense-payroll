import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import IORedis from 'ioredis';

const router = Router();
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null, lazyConnect: true });
redis.on('error', () => {});

router.get('/', async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {};

  // MongoDB
  checks.mongodb = mongoose.connection.readyState === 1 ? 'ok' : 'degraded';

  // Redis
  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'degraded';
  }

  // Ollama
  try {
    const resp = await fetch(`${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/tags`, { signal: AbortSignal.timeout(3000) });
    checks.ollama = resp.ok ? 'ok' : 'degraded';
  } catch {
    checks.ollama = 'unreachable';
  }

  const overall = Object.values(checks).every(v => v === 'ok') ? 'healthy' : 'degraded';
  res.status(overall === 'healthy' ? 200 : 503).json({ status: overall, checks, timestamp: new Date().toISOString() });
});

export default router;
