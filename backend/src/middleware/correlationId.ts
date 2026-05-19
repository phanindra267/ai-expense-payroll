import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { asyncLocalStorage, RequestContext } from '../utils/logger';

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  res.setHeader('X-Request-ID', requestId);

  const context: RequestContext = {
    requestId,
    userId: (req as any).userId,
    organisationId: (req as any).organisationId,
  };

  asyncLocalStorage.run(context, () => {
    next();
  });
}

export function getRequestId(): string {
  const store = asyncLocalStorage.getStore();
  return store?.requestId || 'no-request-id';
}

export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}
