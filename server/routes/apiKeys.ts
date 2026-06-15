import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { createApiKey, deleteApiKey, listApiKeys } from '../services/apiKeys.js';

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  const keys = listApiKeys(req.user!.userId);
  res.json({ success: true, data: { keys } });
});

router.post('/', authMiddleware, (req, res) => {
  const { name } = req.body as { name?: string };
  try {
    const { key, rawKey } = createApiKey(req.user!.userId, name || '');
    res.status(201).json({
      success: true,
      data: {
        key: {
          id: key.id,
          name: key.name,
          key_prefix: key.key_prefix,
          created_at: key.created_at,
        },
        raw_key: rawKey,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, message });
  }
});

router.delete('/:id', authMiddleware, (req, res) => {
  const ok = deleteApiKey(req.user!.userId, String(req.params.id));
  if (!ok) {
    res.status(404).json({ success: false, message: 'API key không tồn tại' });
    return;
  }
  res.json({ success: true, data: { deleted: true } });
});

export default router;
