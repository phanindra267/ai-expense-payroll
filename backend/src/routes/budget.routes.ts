import { Router } from 'express';
import { setBudget, listBudgets, getBudget, deleteBudget } from '../controllers/budget.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listBudgets);
router.get('/:id', getBudget);
router.post('/', requireRole('admin', 'finance'), setBudget);
router.put('/:id', requireRole('admin', 'finance'), setBudget);
router.delete('/:id', requireRole('admin'), deleteBudget);

export default router;
