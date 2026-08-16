import { Router } from 'express';
import {
  gameStatus,
  getProgress,
  getSettings,
  saveProgress,
  updateSettings
} from '../controllers/gameController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/status', gameStatus);
router.get('/progress', requireAuth, getProgress);
router.put('/progress', requireAuth, saveProgress);
router.get('/settings', requireAuth, getSettings);
router.patch('/settings', requireAuth, updateSettings);

export default router;
