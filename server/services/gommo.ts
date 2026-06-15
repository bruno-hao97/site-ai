import { config } from '../config.js';

export interface GommoEnvelope {
  success?: boolean;
  data?: Record<string, unknown>;
  raw?: Record<string, unknown>;
  message?: string;
}

export interface GommoContext {
  accessToken: string;
  domain: string;
  projectId: string;
}

export interface UpstreamUserInfo {
  id_base?: string;
  id_private?: string;
  email?: string;
  name?: string;
  username?: string;
  avatar?: string;
  role?: string;
}

export interface UpstreamBalancesInfo {
  credits_ai?: number;
  balance?: number;
  currency?: string;
}

export interface UpstreamMeResponse {
  success?: boolean;
  message?: string;
  userInfo?: UpstreamUserInfo;
  balancesInfo?: UpstreamBalancesInfo;
  videoCount?: number;
  runtime?: number;
}

const SUCCESS = new Set(['SUCCESS', 'SUCCEEDED', 'DONE', 'COMPLETED']);
const RUNNING = new Set(['PROCESSING', 'PENDING', 'QUEUED', 'ACTIVE']);
const FAILED = new Set(['FAILED', 'ERROR', 'CANCELLED', 'REJECTED']);

export class GommoError extends Error {
  status?: number;
  envelope?: GommoEnvelope;
  constructor(message: string, opts?: { status?: number; envelope?: GommoEnvelope }) {
    super(message);
    this.status = opts?.status;
    this.envelope = opts?.envelope;
  }
}

export function defaultGommoContext(): GommoContext {
  return {
    accessToken: config.gommo.accessToken,
    domain: config.gommo.domain,
    projectId: config.gommo.projectId,
  };
}

function authHeaders(ctx: GommoContext): Record<string, string> {
  return { Authorization: `Bearer ${ctx.accessToken}` };
}

async function parseRes(res: Response): Promise<GommoEnvelope> {
  const text = await res.text();
  try {
    return JSON.parse(text) as GommoEnvelope;
  } catch {
    return { message: text };
  }
}

function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const k = prefix ? `${prefix}[${key}]` : key;
    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flatten(value as Record<string, unknown>, k));
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item != null && typeof item === 'object') {
          Object.assign(out, flatten(item as Record<string, unknown>, `${k}[${i}]`));
        } else if (item != null) out[`${k}[${i}]`] = String(item);
      });
    } else if (value != null && value !== '') {
      out[k] = String(value);
    }
  }
  return out;
}

function toForm(fields: Record<string, unknown>): string {
  return new URLSearchParams(flatten(fields)).toString();
}

async function request(
  ctx: GommoContext,
  path: string,
  opts: { method?: string; body?: string | FormData; headers?: Record<string, string> } = {},
): Promise<GommoEnvelope> {
  if (!ctx.accessToken) {
    throw new GommoError('Chưa có access token upstream');
  }
  const res = await fetch(`${config.gommo.baseUrl}${path}`, {
    method: opts.method || 'GET',
    headers: { ...authHeaders(ctx), ...opts.headers },
    body: opts.body,
  });
  const envelope = await parseRes(res);
  if (!res.ok || envelope.success === false) {
    throw new GommoError(envelope.message || `Gommo HTTP ${res.status}`, {
      status: res.status,
      envelope,
    });
  }
  return envelope;
}

export async function fetchUpstreamMe(
  accessToken: string,
  domain: string,
): Promise<UpstreamMeResponse> {
  const body = new URLSearchParams({
    access_token: accessToken.trim(),
    domain: domain.trim(),
  }).toString();

  const url = `${config.gommo.authBaseUrl}${config.gommo.authPath}/ai/me`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const text = await res.text();
  let parsed: UpstreamMeResponse;
  try {
    parsed = JSON.parse(text) as UpstreamMeResponse;
  } catch {
    throw new GommoError(text || `Upstream /ai/me HTTP ${res.status}`, { status: res.status });
  }

  if (!res.ok || parsed.success === false) {
    throw new GommoError(parsed.message || `Upstream /ai/me HTTP ${res.status}`, {
      status: res.status,
      envelope: parsed as unknown as GommoEnvelope,
    });
  }

  if (!parsed.userInfo?.id_base && !parsed.userInfo?.email) {
    throw new GommoError('Token hợp lệ nhưng thiếu thông tin user');
  }

  return parsed;
}

export async function validateUpstreamToken(ctx: GommoContext): Promise<UpstreamMeResponse> {
  return fetchUpstreamMe(ctx.accessToken, ctx.domain);
}

export async function fetchModels(type: string, ctx: GommoContext): Promise<GommoEnvelope> {
  const q = `type=${encodeURIComponent(type)}&domain=${encodeURIComponent(ctx.domain)}`;
  try {
    return await request(ctx, `/ai/models?${q}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toForm({ type, domain: ctx.domain }),
    });
  } catch {
    return await request(ctx, `/ai/models?${q}`);
  }
}

export async function createGommoJob(
  ctx: GommoContext,
  type: string,
  modelId: string,
  fields: Record<string, unknown>,
): Promise<GommoEnvelope> {
  return request(ctx, `/ai/jobs/${type}/${modelId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: toForm({
      domain: ctx.domain,
      project_id: ctx.projectId,
      ...fields,
    }),
  });
}

export async function pollGommoJob(
  ctx: GommoContext,
  jobId: string,
  media: 'image' | 'video' | 'music',
): Promise<GommoEnvelope> {
  return request(ctx, `/ai/jobs/${encodeURIComponent(jobId)}?media=${media}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: toForm({
      domain: ctx.domain,
      ...(media === 'music' ? { project_id: ctx.projectId } : {}),
    }),
  });
}

export function extractPollSnapshot(envelope: GommoEnvelope) {
  const data = (envelope.data || {}) as Record<string, unknown>;
  const raw = envelope.raw || {};
  const imageInfo = raw.imageInfo as { status?: string; result_url?: string } | undefined;
  const videoInfo = raw.videoInfo as { status?: string; result_url?: string; url?: string } | undefined;
  return {
    status: String(data.status || imageInfo?.status || videoInfo?.status || ''),
    resultUrl:
      (data.result_url as string) ||
      imageInfo?.result_url ||
      videoInfo?.result_url ||
      videoInfo?.url ||
      null,
    idBase: String(data.id_base || data.job_id || ''),
  };
}

export function classifyStatus(status: string, resultUrl: string | null): 'success' | 'running' | 'failed' | 'unknown' {
  const s = status.toUpperCase();
  if (resultUrl && /^https?:\/\//i.test(resultUrl) && !RUNNING.has(s)) return 'success';
  if (SUCCESS.has(s)) return 'success';
  if (RUNNING.has(s)) return 'running';
  if (FAILED.has(s)) return 'failed';
  if (resultUrl && /^https?:\/\//i.test(resultUrl)) return 'success';
  return 'unknown';
}

const POLL_INTERVAL_MS = 3500;
const POLL_MAX_ATTEMPTS = 80;

export async function pollUntilDone(
  ctx: GommoContext,
  gommoJobId: string,
  media: 'image' | 'video' | 'music',
): Promise<{ success: boolean; resultUrl?: string | null; error?: string; timeout?: boolean }> {
  for (let i = 1; i <= POLL_MAX_ATTEMPTS; i++) {
    const envelope = await pollGommoJob(ctx, gommoJobId, media);
    const snap = extractPollSnapshot(envelope);
    const phase = classifyStatus(snap.status, snap.resultUrl);
    if (phase === 'success') return { success: true, resultUrl: snap.resultUrl };
    if (phase === 'failed') return { success: false, error: snap.status || 'failed' };
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return { success: false, timeout: true, error: 'Poll timeout (~5 phút)' };
}
