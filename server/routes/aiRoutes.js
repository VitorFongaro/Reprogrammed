import { Router } from 'express';
import { aiStatus, postPuzzle } from '../controllers/aiController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/status', aiStatus);
router.post('/puzzle', requireAuth, postPuzzle);

export default router;
