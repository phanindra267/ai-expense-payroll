import { Request, Response, NextFunction } from 'express';
import IdempotencyRecord from '../models/IdempotencyRecord';
import logger from '../utils/logger';

export async function idempotency(req: Request, res: Response, next: NextFunction): Promise<void> {
  const key = req.headers['idempotency-key'] as string | undefined;
  if (!key) { next(); return; }

  try {
    const existing = await IdempotencyRecord.findOne({ key });
    if (existing) {
      logger.info('Idempotency cache hit', { key });
      res.status(existing.statusCode).json(existing.body);
      return;
    }

    // Monkey-patch res.json to capture response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      IdempotencyRecord.create({
        key,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        body,
        organisationId: (req as any).user?.organisationId,
      }).catch(err => logger.error('Failed to save idempotency record', { err }));
      return originalJson(body);
    };

    next();
  } catch (err: any) {
    next(err);
  }
}
