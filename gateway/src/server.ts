import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createClient } from 'redis';

const app = express();
const PORT = process.env.PORT || 8080;

// Security & Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('combined')); // Basic access logs

// Redis for Threat Detection / IP Scoring
const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.connect().catch(console.error);

// Gateway Rate Limiting (Global)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 1000,
  message: { code: 'RATE_LIMIT', message: 'Gateway rate limit exceeded' }
});
app.use(globalLimiter);

// Threat Detection Middleware (Login Anomaly / IP Risk Scoring)
app.use(async (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  try {
    const score = await redisClient.get(`risk:${ip}`);
    if (score && parseInt(score, 10) > 100) {
      return res.status(403).json({ code: 'BLOCKED', message: 'IP addresses flagged for suspicious activity.' });
    }
  } catch (err) {
    // Fail open if redis is down
  }
  next();
});

// Routing Rules
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const ML_URL = process.env.ML_URL || 'http://localhost:8000';

app.use('/api/ai', createProxyMiddleware({ target: BACKEND_URL, changeOrigin: true }));
app.use('/api', createProxyMiddleware({ target: BACKEND_URL, changeOrigin: true }));
app.use('/ml', createProxyMiddleware({ target: ML_URL, changeOrigin: true }));

app.get('/health', (req, res) => res.status(200).json({ status: 'Gateway OK' }));

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
});
