import { Router } from 'express';
import { deluluChat, getDeluluHistory } from '../controllers/deluluController';

const router = Router();

// POST /api/delulu/chat — send a message and get a reply
router.post('/chat', deluluChat);

// GET /api/delulu/history/:userId — fetch history + wellness score
router.get('/history/:userId', getDeluluHistory);

export default router;
