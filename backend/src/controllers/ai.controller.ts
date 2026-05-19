import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { checkSafety } from '../services/ai/safetyFilter';
import { runAgent } from '../services/ai/langchain.service';
import { AVAILABLE_ROLES } from '../services/ai/rolePrompts';
import { AppError } from '../middleware/errorHandler';

export async function chat(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { query, role = 'analyst' } = req.body;
    if (!query || typeof query !== 'string') {
      throw new AppError('query is required', 400, 'VALIDATION_ERROR');
    }
    if (!AVAILABLE_ROLES.includes(role)) {
      throw new AppError(`role must be one of: ${AVAILABLE_ROLES.join(', ')}`, 400, 'VALIDATION_ERROR');
    }

    const safetyCheck = await checkSafety(query, req.user!.userId);
    if (!safetyCheck.safe) {
      throw new AppError(safetyCheck.reason || 'Query blocked by safety filter', 400, 'POLICY_VIOLATION');
    }

    const result = await runAgent(query, role, {
      orgId: req.user!.organisationId,
      userId: req.user!.userId,
    });

    res.json({ ...result, role, query });
  } catch (err) { next(err); }
}

export function getRoles(_req: AuthRequest, res: Response): void {
  res.json({ roles: AVAILABLE_ROLES });
}
