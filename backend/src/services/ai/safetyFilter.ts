import IORedis from 'ioredis';
import { aiSafetyRejections } from '../../utils/metrics';

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
redis.on('error', () => {});

// ─── Injection patterns ───────────────────────────────────────────────────────
const BLOCKED_PATTERNS: RegExp[] = [
  /(\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b|\bTRUNCATE\b)/i,  // SQL
  /(\$where|\$function|\$accumulator|mapReduce)/i,                  // MongoDB injection
  /(rm\s+-rf|del\s+\/|format\s+c:|shutdown|reboot)/i,             // Command injection
  /ignore\s+(all\s+)?previous\s+instructions?/i,                   // Prompt injection
  /you\s+are\s+now\s+(a\s+)?different/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /jailbreak|DAN\s+mode|developer\s+mode/i,
  /<script|javascript:/i,                                           // XSS
  /system\s+prompt|reveal\s+(your\s+)?instructions/i,
];

// ─── Sliding window rate limit per tool per user (5/min) ─────────────────────
const TOOL_RATE_LIMIT = parseInt(process.env.AI_TOOL_RATE_LIMIT || '5');
const TOOL_RATE_WINDOW = 60; // seconds

export async function checkSafety(prompt: string, userId: string): Promise<{ safe: boolean; reason?: string }> {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(prompt)) {
      aiSafetyRejections.inc();
      return { safe: false, reason: `POLICY_VIOLATION: Blocked pattern detected (${pattern.source.substring(0, 30)}...)` };
    }
  }
  return { safe: true };
}

export async function checkToolRateLimit(tool: string, userId: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const key = `ai:tool:${userId}:${tool}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - TOOL_RATE_WINDOW;

    await redis.zremrangebyscore(key, '-inf', windowStart);
    const count = await redis.zcard(key);

    if (count >= TOOL_RATE_LIMIT) {
      const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const retryAfter = TOOL_RATE_WINDOW - (now - parseInt(oldest[1] || '0'));
      return { allowed: false, retryAfter };
    }

    await redis.zadd(key, now, `${now}-${Math.random()}`);
    await redis.expire(key, TOOL_RATE_WINDOW + 5);
  } catch (err) {
    // Redis is down, allow request to bypass rate limit
  }
  return { allowed: true };
}
