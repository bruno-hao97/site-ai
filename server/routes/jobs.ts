import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { fetchModels, uploadMedia } from '../services/gommo.js';
import { getUpstreamContext } from '../services/upstreamAuth.js';
import {
  getJob,
  getJobCost,
  isStudioJobType,
  listJobs,
  startImageJob,
  startStudioJob,
  startVideoJob,
  toPublicJob,
  type StudioJobType,
} from '../services/jobs.js';
import { getBalance } from '../services/credits.js';

const router = Router();

router.get('/costs', authMiddleware, (_req, res) => {
  res.json({
    success: true,
    data: {
      image: getJobCost('image'),
      video: getJobCost('video'),
      tts: getJobCost('tts'),
      music: getJobCost('music'),
      'avatar-lipsync': getJobCost('avatar-lipsync'),
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
  template_id?: string;
  references?: { url: string }[];
  images?: { url: string }[];
  subjects?: { url: string }[];
}

function buildPayload(body: CreateJobBody): Record<string, unknown> | null {
  if (!body.model_id?.trim()) return null;
  if (!body.prompt?.trim()) return null;

  const payload: Record<string, unknown> = { prompt: body.prompt.trim() };
  if (body.ratio) payload.ratio = body.ratio;
  if (body.resolution) payload.resolution = body.resolution;
  if (body.mode) payload.mode = body.mode;
  if (body.duration) payload.duration = body.duration;
  if (body.template_id) payload.template_id = body.template_id;
  if (body.references?.length) payload.references = body.references;
  if (body.images?.length) payload.images = body.images;
  if (body.subjects?.length) payload.subjects = body.subjects;
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

const RESERVED_PAYLOAD_KEYS = new Set(['domain', 'project_id']);

// Endpoint chung cho mọi loại job studio (image/video/tts/music).
// Client gửi sẵn payload đã build; backend tự gắn domain/project_id từ ctx.
router.post('/create', authMiddleware, (req, res) => {
  const userId = req.user!.userId;
  const body = req.body as { type?: string; model_id?: string; payload?: unknown };

  const type = String(body.type || '');
  if (!isStudioJobType(type)) {
    res.status(400).json({ success: false, message: 'type không hợp lệ' });
    return;
  }
  if (!body.model_id?.trim()) {
    res.status(400).json({ success: false, message: 'model_id là bắt buộc' });
    return;
  }
  if (!body.payload || typeof body.payload !== 'object') {
    res.status(400).json({ success: false, message: 'payload là bắt buộc' });
    return;
  }

  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body.payload as Record<string, unknown>)) {
    if (RESERVED_PAYLOAD_KEYS.has(key)) continue;
    if (value !== undefined && value !== null && value !== '') payload[key] = value;
  }
  if (!payload.prompt && !payload.text && !payload.name) {
    res.status(400).json({ success: false, message: 'Thiếu nội dung (prompt/text/name)' });
    return;
  }

  const cost = getJobCost(type as StudioJobType);
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
    const job = startStudioJob(userId, type as StudioJobType, body.model_id.trim(), payload);
    res.status(202).json({
      success: true,
      data: { job: toPublicJob(job), balance: getBalance(userId), cost },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes('Không đủ credit') ? 402 : 500;
    res.status(status).json({ success: false, message });
  }
});

interface UploadBody {
  kind?: string;
  file_name?: string;
  mime?: string;
  file_base64?: string;
}

router.post('/upload', authMiddleware, async (req, res) => {
  const body = req.body as UploadBody;
  const kind = body.kind === 'video' ? 'video' : 'image';
  if (!body.file_base64) {
    res.status(400).json({ success: false, message: 'file_base64 là bắt buộc' });
    return;
  }

  try {
    const buffer = Buffer.from(body.file_base64, 'base64');
    const ctx = getUpstreamContext(req.user!.userId);
    const fileName = body.file_name?.trim() || (kind === 'image' ? 'upload.png' : 'upload.mp4');
    const mime = body.mime?.trim() || (kind === 'image' ? 'image/png' : 'video/mp4');
    const { url } = await uploadMedia(ctx, kind, buffer, fileName, mime);
    res.json({ success: true, data: { url } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({ success: false, message });
  }
});

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
