import { Router } from 'express';
import { processPayroll, updatePayrollStatus, listPayrolls, getSalarySlip } from '../controllers/payroll.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', listPayrolls);
router.post('/process', requireRole('admin', 'hr'), processPayroll);
router.put('/:id/status', requireRole('admin', 'hr'), updatePayrollStatus);
router.get('/:id/slip', getSalarySlip);

export default router;
