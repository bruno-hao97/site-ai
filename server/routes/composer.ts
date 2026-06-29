import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { config } from '../config.js';
import {
  enhancePromptUpstream,
  generateShotsUpstream,
  normalizePromptUpstream,
} from '../services/composerAi.js';

const router = Router();

router.post('/prompt', authMiddleware, async (req, res) => {
  if (!config.gommo.accessToken?.trim()) {
    res.status(503).json({ success: false, message: 'AI chưa sẵn sàng trên server.' });
    return;
  }

  const action = String(req.body?.action || 'enhance');
  const text = String(req.body?.text || '').trim();
  const jobType = String(req.body?.jobType || 'image');

  if (!text) {
    res.status(400).json({ success: false, message: 'Thiếu nội dung text.' });
    return;
  }

  try {
    let result: string;
    if (action === 'normalize') {
      result = await normalizePromptUpstream(text, jobType);
    } else if (action === 'shots') {
      result = await generateShotsUpstream(text, jobType);
    } else {
      result = await enhancePromptUpstream(text, jobType);
    }
    res.json({ success: true, data: { text: result } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({ success: false, message });
  }
});

export default router;
