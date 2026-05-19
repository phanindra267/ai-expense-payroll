import { Request, Response, NextFunction } from 'express';
import { SecurityAudit } from '../models/SecurityAudit';

export const auditLog = (action: string, resource: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Intercept response finish
    res.on('finish', async () => {
      // Only log successful mutating actions or specific sensitive reads
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          if ((req as any).user && (req as any).user.organisationId) {
            await SecurityAudit.create({
              organisationId: (req as any).user.organisationId,
              userId: (req as any).user.userId || (req as any).user.id,
              action,
              resource,
              details: {
                method: req.method,
                url: req.originalUrl,
                query: req.query,
                // Don't log sensitive body contents (passwords, etc)
                body: ['login', 'register', 'password'].some(s => req.originalUrl.includes(s)) ? '[REDACTED]' : req.body
              },
              ipAddress: req.ip || req.headers['x-forwarded-for'],
              userAgent: req.headers['user-agent']
            });
          }
        } catch (error) {
          console.error('[Audit Log Error]', error);
          // Do not fail the request if audit logging fails, but log it centrally
        }
      }
    });
    next();
  };
};
