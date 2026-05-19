import { Router } from 'express';
import { listExpenses, getExpense, createExpense, updateExpense, deleteExpense, uploadReceipt } from '../controllers/expense.controller';
import { authenticate } from '../middleware/auth';
import { idempotency } from '../middleware/idempotency';
import { auditLog } from '../middleware/audit';

const router = Router();
router.use(authenticate);

router.get('/', listExpenses);
router.get('/:id', getExpense);
router.post('/', uploadReceipt.single('receipt'), idempotency, auditLog('create_expense', 'expense'), createExpense);
router.put('/:id', auditLog('update_expense', 'expense'), updateExpense);
router.delete('/:id', auditLog('delete_expense', 'expense'), deleteExpense);

export default router;
