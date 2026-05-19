import { Router } from 'express';
import { chat, getRoles } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(authenticate);
router.get('/roles', getRoles);
router.post('/chat', aiLimiter, chat);

export default router;
