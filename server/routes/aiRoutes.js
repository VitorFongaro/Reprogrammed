import { Router } from 'express';
import { aiStatus } from '../controllers/aiController.js';

const router = Router();

router.get('/status', aiStatus);

export default router;
