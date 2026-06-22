import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getUpstreamContext } from '../services/upstreamAuth.js';
import {
  fetchMyImages,
  fetchMyVideos,
  fetchNewsfeed,
  fetchNewsList,
  fetchPublicVideos,
} from '../services/gommo.js';

const router = Router();

function pickFields(src: unknown, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const obj = (src && typeof src === 'object' ? src : {}) as Record<string, unknown>;
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== '') {
      out[key] = String(value);
    }
  }
  return out;
}

function proxy(
  keys: string[],
  call: (ctx: ReturnType<typeof getUpstreamContext>, fields: Record<string, string>) => Promise<unknown>,
) {
  return async (req: import('express').Request, res: import('express').Response) => {
    try {
      const ctx = getUpstreamContext(req.user!.userId);
      const data = await call(ctx, pickFields(req.body, keys));
      res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(502).json({ success: false, message });
    }
  };
}

router.post(
  '/newsfeed',
  authMiddleware,
  proxy(['limit', 'project_id', 'privacy', 'after_video_id', 'after_image_id'], fetchNewsfeed),
);

router.post(
  '/public-videos',
  authMiddleware,
  proxy(['type', 'public_prompt', 'limit', 'after_id'], fetchPublicVideos),
);

router.post('/news', authMiddleware, proxy(['limit'], fetchNewsList));

const MINE_KEYS = ['limit', 'project_id', 'order_by', 'sort_by', 'after_id'];
router.post('/my-videos', authMiddleware, proxy(MINE_KEYS, fetchMyVideos));
router.post('/my-images', authMiddleware, proxy(MINE_KEYS, fetchMyImages));

export default router;
