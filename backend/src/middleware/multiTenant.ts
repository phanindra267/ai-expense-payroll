import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AppError } from './errorHandler';

/**
 * Validates that the resource's organisationId matches the requester's organisationId.
 * Used on routes that accept :organisationId as a param.
 */
export function enforceOrgScope(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AppError('Not authenticated', 401, 'UNAUTHORIZED'));
  }
  const paramOrgId = req.params.organisationId;
  if (paramOrgId && paramOrgId !== req.user.organisationId) {
    return next(new AppError('Cross-tenant access denied', 403, 'CROSS_TENANT'));
  }
  next();
}

/**
 * Injects organisationId into req.query/body for automatic scoping.
 */
export function injectOrgId(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user) {
    // Attach so controllers can reference req.orgId safely
    (req as any).orgId = req.user.organisationId;
  }
  next();
}
