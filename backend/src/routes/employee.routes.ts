import { Router } from 'express';
import { listEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee, addAdjustment } from '../controllers/employee.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate);

router.get('/', listEmployees);
router.get('/:id', getEmployee);
router.post('/', requireRole('admin', 'hr'), auditLog('create_employee', 'employee'), createEmployee);
router.put('/:id', requireRole('admin', 'hr'), auditLog('update_employee', 'employee'), updateEmployee);
router.delete('/:id', requireRole('admin'), auditLog('delete_employee', 'employee'), deleteEmployee);
router.post('/:id/adjustments', requireRole('admin', 'hr'), auditLog('add_adjustment', 'employee'), addAdjustment);

export default router;
