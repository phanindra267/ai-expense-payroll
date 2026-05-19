import { Router } from 'express';
import { exportMonthlyCSV, exportYearlyCSV } from '../controllers/reports.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/monthly', exportMonthlyCSV);
router.get('/yearly', exportYearlyCSV);

export default router;
