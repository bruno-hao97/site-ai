import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { fetchModels } from '../services/gommo.js';
import { getUpstreamContext } from '../services/upstreamAuth.js';
import {
  getJob,
  getJobCost,
  listJobs,
  startImageJob,
  startVideoJob,
  toPublicJob,
} from '../services/jobs.js';
import { getBalance } from '../services/credits.js';

const router = Router();

router.get('/costs', authMiddleware, (_req, res) => {
  res.json({
    success: true,
    data: {
      image: getJobCost('image'),
      video: getJobCost('video'),
    },
  });
});

router.get('/models', authMiddleware, async (req, res) => {
  const type = String(req.query.type || 'image');
  try {
    const ctx = getUpstreamContext(req.user!.userId);
    const envelope = await fetchModels(type, ctx);
    res.json({ success: true, data: envelope.data, raw: envelope.raw });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({ success: false, message });
  }
});

interface CreateJobBody {
  model_id?: string;
  prompt?: string;
  ratio?: string;
  resolution?: string;
  mode?: string;
  duration?: string;
  references?: { url: string }[];
  images?: { url: string }[];
}

function buildPayload(body: CreateJobBody): Record<string, unknown> | null {
  if (!body.model_id?.trim()) return null;
  if (!body.prompt?.trim()) return null;

  const payload: Record<string, unknown> = { prompt: body.prompt.trim() };
  if (body.ratio) payload.ratio = body.ratio;
  if (body.resolution) payload.resolution = body.resolution;
  if (body.mode) payload.mode = body.mode;
  if (body.duration) payload.duration = body.duration;
  if (body.references?.length) payload.references = body.references;
  if (body.images?.length) payload.images = body.images;
  return payload;
}

function handleCreateJob(
  type: 'image' | 'video',
  startFn: typeof startImageJob,
) {
  return (req: import('express').Request, res: import('express').Response) => {
    const userId = req.user!.userId;
    const body = req.body as CreateJobBody;

    const payload = buildPayload(body);
    if (!payload) {
      res.status(400).json({
        success: false,
        message: !body.model_id?.trim() ? 'model_id là bắt buộc' : 'prompt là bắt buộc',
      });
      return;
    }

    const cost = getJobCost(type);
    const balance = getBalance(userId);
    if (balance < cost) {
      res.status(402).json({
        success: false,
        message: `Không đủ credit (cần ${cost}, có ${balance})`,
        data: { balance, cost },
      });
      return;
    }

    try {
      const job = startFn(userId, body.model_id!.trim(), payload);
      res.status(202).json({
        success: true,
        data: { job: toPublicJob(job), balance: getBalance(userId), cost },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes('Không đủ credit') ? 402 : 500;
      res.status(status).json({ success: false, message });
    }
  };
}

router.post('/image', authMiddleware, handleCreateJob('image', startImageJob));
router.post('/video', authMiddleware, handleCreateJob('video', startVideoJob));

router.get('/', authMiddleware, (req, res) => {
  const jobs = listJobs(req.user!.userId).map(toPublicJob);
  res.json({ success: true, data: { jobs } });
});

router.get('/:id', authMiddleware, (req, res) => {
  const job = getJob(String(req.params.id), req.user!.userId);
  if (!job) {
    res.status(404).json({ success: false, message: 'Job không tồn tại' });
    return;
  }
  res.json({
    success: true,
    data: { job: toPublicJob(job), balance: getBalance(req.user!.userId) },
  });
});

export default router;
