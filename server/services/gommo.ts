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

/**
 * Đăng nhập Gommo bằng email + mật khẩu để lấy access_token của chính user.
 * POST {authBaseUrl}{authPath}/auth/login (x-www-form-urlencoded).
 */
export async function gommoLoginWithPassword(
  email: string,
  password: string,
  domain: string,
): Promise<string> {
  const url = `${config.gommo.authBaseUrl}${config.gommo.authPath}/auth/login`;
  const body = new URLSearchParams({
    email: email.trim(),
    password,
    domain: domain.trim(),
  }).toString();

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const text = await res.text();
  let parsed: { access_token?: string; success?: boolean; message?: string };
  try {
    parsed = JSON.parse(text) as typeof parsed;
  } catch {
    throw new GommoError(text || `auth/login HTTP ${res.status}`, { status: res.status });
  }

  if (!res.ok || parsed.success === false || !parsed.access_token) {
    throw new GommoError(parsed.message || 'Đăng nhập Gommo thất bại', { status: res.status });
  }

  return parsed.access_token;
}

/**
 * Đăng ký tài khoản Gommo. POST {authBaseUrl}{authPath}/auth/register.
 * Thành công trả thẳng access_token; lỗi trùng dùng dạng { error: 1, message }.
 */
export async function gommoRegisterWithPassword(input: {
  name?: string;
  email: string;
  password: string;
  phone: string;
  domain: string;
}): Promise<string> {
  const url = `${config.gommo.authBaseUrl}${config.gommo.authPath}/auth/register`;
  const body = new URLSearchParams({
    name: input.name?.trim() || '',
    email: input.email.trim(),
    password: input.password,
    phone: input.phone.trim(),
    domain: input.domain.trim(),
  }).toString();

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const text = await res.text();
  let parsed: { access_token?: string; success?: boolean; error?: number; message?: string };
  try {
    parsed = JSON.parse(text) as typeof parsed;
  } catch {
    throw new GommoError(text || `auth/register HTTP ${res.status}`, { status: res.status });
  }

  if (!res.ok || parsed.error || parsed.success === false || !parsed.access_token) {
    throw new GommoError(parsed.message || 'Đăng ký Gommo thất bại', { status: res.status });
  }

  return parsed.access_token;
}

/**
 * Proxy tới các endpoint công khai trên auth host (api.gommo.net): newsfeed,
 * public-videos, news/getAll. Token nằm trong body (không phải Bearer header).
 * Trả raw JSON của upstream để client parse như cũ.
 */
async function authPost(
  ctx: GommoContext,
  path: string,
  fields: Record<string, string>,
): Promise<unknown> {
  if (!ctx.accessToken) {
    throw new GommoError('Chưa có access token upstream');
  }
  const body = new URLSearchParams({
    access_token: ctx.accessToken,
    domain: ctx.domain,
    ...fields,
  }).toString();

  const res = await fetch(`${config.gommo.authBaseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const text = await res.text();
  let parsed: { success?: boolean; message?: string } & Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GommoError(text || `Gommo HTTP ${res.status}`, { status: res.status });
  }
  if (!res.ok || parsed.success === false) {
    throw new GommoError(parsed.message || `Gommo HTTP ${res.status}`, { status: res.status });
  }
  return parsed;
}

export function fetchNewsfeed(ctx: GommoContext, fields: Record<string, string>): Promise<unknown> {
  return authPost(ctx, '/ai/newfeeds', fields);
}

export function fetchPublicVideos(ctx: GommoContext, fields: Record<string, string>): Promise<unknown> {
  return authPost(ctx, `${config.gommo.authPath}/ai/public-videos`, fields);
}

export function fetchNewsList(ctx: GommoContext, fields: Record<string, string>): Promise<unknown> {
  return authPost(ctx, `${config.gommo.authPath}/news/getAll`, fields);
}

/** Video của chính user (theo token + project_id). */
export function fetchMyVideos(ctx: GommoContext, fields: Record<string, string>): Promise<unknown> {
  return authPost(ctx, '/ai/videos', { project_id: ctx.projectId, ...fields });
}

/** Ảnh của chính user (theo token + project_id). */
export function fetchMyImages(ctx: GommoContext, fields: Record<string, string>): Promise<unknown> {
  return authPost(ctx, '/ai/images', { project_id: ctx.projectId, ...fields });
}

/** Proxy upload ảnh/video lên Gommo (multipart) bằng token của ctx. */
export async function uploadMedia(
  ctx: GommoContext,
  kind: 'image' | 'video',
  buffer: Buffer,
  fileName: string,
  mime: string,
): Promise<{ url: string }> {
  if (!ctx.accessToken) {
    throw new GommoError('Chưa có access token upstream');
  }
  const form = new FormData();
  form.append('access_token', ctx.accessToken);
  form.append('domain', ctx.domain);
  form.append('project_id', ctx.projectId);
  const blob = new Blob([buffer], { type: mime });
  if (kind === 'image') {
    form.append('file', blob, fileName);
    form.append('file_name', fileName);
    form.append('size', String(buffer.length));
  } else {
    form.append('video_file', blob, fileName);
  }

  const res = await fetch(`${config.gommo.baseUrl}/ai/upload/${kind}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ctx.accessToken}` },
    body: form,
  });

  const text = await res.text();
  let parsed: { success?: boolean; message?: string; data?: Record<string, string>; url?: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GommoError(text || `Upload HTTP ${res.status}`, { status: res.status });
  }
  if (!res.ok || parsed.success === false) {
    throw new GommoError(parsed.message || `Upload HTTP ${res.status}`, { status: res.status });
  }

  const data = parsed.data || {};
  const url = data.url || data.result_url || data.image_url || data.video_url || parsed.url;
  if (!url) throw new GommoError('Upload thành công nhưng không có URL');
  return { url };
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
  const musicInfo = raw.musicInfo as { status?: string; result_url?: string; url?: string } | undefined;
  const audioInfo = raw.audioInfo as { status?: string; result_url?: string; url?: string } | undefined;
  return {
    status: String(
      data.status || imageInfo?.status || videoInfo?.status || musicInfo?.status || audioInfo?.status || '',
    ),
    resultUrl:
      (data.result_url as string) ||
      (data.url as string) ||
      imageInfo?.result_url ||
      videoInfo?.result_url ||
      videoInfo?.url ||
      musicInfo?.result_url ||
      musicInfo?.url ||
      audioInfo?.result_url ||
      audioInfo?.url ||
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
