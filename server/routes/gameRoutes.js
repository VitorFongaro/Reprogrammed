import { Router } from 'express';
import { gameStatus } from '../controllers/gameController.js';

const router = Router();

router.get('/status', gameStatus);

export default router;
