import { GOMMO_AUTH_BASE, GOMMO_AUTH_PATH, UpstreamMeError } from './upstreamMe';
import { getSessionToken } from './session';
import { clearAuth, loadAuth } from './authStore';

/**
 * Gọi feed/explore qua backend proxy nếu có phiên JWT (backend dùng token chung),
 * ngược lại gọi thẳng Gommo bằng access token của user (đăng nhập bằng token).
 */
async function feedRequest<T extends { success?: boolean; message?: string }>(
  backendPath: string,
  gommoUrl: string,
  fields: Record<string, string>,
): Promise<T> {
  const token = getSessionToken();
  if (token) {
    const res = await fetch(`/api/feed${backendPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(fields),
    });
    return parseFeedRes<T>(res);
  }

  const auth = loadAuth();
  if (!auth?.access_token) throw new UpstreamMeError('Chưa đăng nhập', 401);
  const body = new URLSearchParams({
    access_token: auth.access_token.trim(),
    domain: auth.domain.trim(),
    ...fields,
  }).toString();
  const res = await fetch(gommoUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return parseFeedRes<T>(res);
}

async function parseFeedRes<T extends { success?: boolean; message?: string }>(
  res: Response,
): Promise<T> {
  // Token (Gommo hoặc JWT backend) hết hạn → đăng xuất, về trang login.
  if (res.status === 401 || res.status === 403) {
    clearAuth();
    if (typeof window !== 'undefined') window.location.href = '/login';
  }
  const text = await res.text();
  let parsed: T;
  try {
    parsed = JSON.parse(text) as T;
  } catch {
    throw new UpstreamMeError(text || `HTTP ${res.status}`, res.status);
  }
  if (!res.ok || parsed.success === false) {
    throw new UpstreamMeError(parsed.message || `HTTP ${res.status}`, res.status);
  }
  return parsed;
}

export interface FeedResolution {
  type: string;
  status?: string;
  id_base?: string;
  url?: string;
}

export interface FeedImageRef {
  url: string;
  file_name?: string;
  created_time?: number;
}

export interface FeedAuthor {
  name?: string;
  id_base?: string;
  avatar?: string;
  username?: string;
}

export interface FeedModelInfo {
  id_base?: string;
  name?: string;
  model?: string;
}

export interface FeedItem {
  id_base: string;
  type: 'video' | 'image' | string;
  status: string;
  model?: string;
  modelInfo?: FeedModelInfo;
  mode?: string;
  ratio?: string;
  resolution?: string;
  duration?: string;
  title?: string;
  resolutions?: FeedResolution[];
  images?: FeedImageRef[];
  objects?: FeedImageRef[];
  download_url?: string;
  thumbnail_url?: string;
  thumbnail_end_url?: string;
  prompt?: string;
  credit_fee?: number;
  like_count?: number;
  likes_count?: number;
  comments_count?: number;
  created_time?: string | number;
  author?: FeedAuthor;
  isMe?: boolean;
}

export interface FeedPage {
  items: FeedItem[];
  nextAfterVideoId: string;
  nextAfterImageId: string;
}

interface FeedResponse {
  success?: boolean;
  message?: string;
  data?: FeedItem[];
  next_after_video_id?: string;
  next_after_image_id?: string;
  runtime?: number;
}

export interface FetchFeedParams {
  limit?: number;
  privacy?: string;
  projectId?: string;
  afterVideoId?: string;
  afterImageId?: string;
}

export async function fetchNewsfeed(params: FetchFeedParams = {}): Promise<FeedPage> {
  const {
    limit = 30,
    privacy = 'PUBLIC',
    projectId = 'default',
    afterVideoId = '',
    afterImageId = '',
  } = params;

  const fields: Record<string, string> = {
    limit: String(limit),
    project_id: projectId,
    privacy,
  };
  if (afterVideoId) fields.after_video_id = afterVideoId;
  if (afterImageId) fields.after_image_id = afterImageId;

  const parsed = await feedRequest<FeedResponse>(
    '/newsfeed',
    `${GOMMO_AUTH_BASE}/ai/newfeeds`,
    fields,
  );

  return {
    items: parsed.data ?? [],
    nextAfterVideoId: parsed.next_after_video_id ?? '',
    nextAfterImageId: parsed.next_after_image_id ?? '',
  };
}

interface PublicVideosResponse {
  success?: boolean;
  message?: string;
  data?: FeedItem[];
  next_after_id?: string;
  after_id?: string;
}

export interface PublicVideosPage {
  items: FeedItem[];
  nextAfterId: string;
}

export interface FetchPublicVideosParams {
  type?: string;
  publicPrompt?: boolean;
  limit?: number;
  afterId?: string;
}

export async function fetchPublicVideos(params: FetchPublicVideosParams = {}): Promise<PublicVideosPage> {
  const {
    type = 'public_home',
    publicPrompt = false,
    limit = 30,
    afterId = '',
  } = params;

  const fields: Record<string, string> = {
    type,
    public_prompt: String(publicPrompt),
    limit: String(limit),
  };
  if (afterId) fields.after_id = afterId;

  const parsed = await feedRequest<PublicVideosResponse>(
    '/public-videos',
    `${GOMMO_AUTH_BASE}${GOMMO_AUTH_PATH}/ai/public-videos`,
    fields,
  );

  const items = parsed.data ?? [];
  const last = items.length ? items[items.length - 1] : undefined;
  const nextAfterId = parsed.next_after_id ?? parsed.after_id ?? last?.id_base ?? '';

  return { items, nextAfterId };
}

export interface MinePage {
  items: FeedItem[];
  nextAfterId: string;
}

export interface FetchMineParams {
  limit?: number;
  afterId?: string;
}

interface MineVideosResponse {
  success?: boolean;
  message?: string;
  data?: FeedItem[];
  next_after_id?: string;
}

interface MyImageItem {
  id_base: string;
  url?: string;
  url_preview?: string;
  prompt?: string;
  model?: string;
  ratio?: string;
  resolution?: string;
  status?: string;
  created_at?: number | string;
  isMe?: boolean;
}

interface MineImagesResponse {
  success?: boolean;
  message?: string;
  data?: MyImageItem[];
  next_after_id?: string;
}

function mapImageToFeedItem(img: MyImageItem): FeedItem {
  return {
    id_base: img.id_base,
    type: 'image',
    status: img.status || 'SUCCESS',
    prompt: img.prompt,
    model: img.model,
    ratio: img.ratio,
    resolution: img.resolution,
    thumbnail_url: img.url_preview || img.url,
    download_url: img.url,
    created_time: img.created_at,
    isMe: img.isMe,
  };
}

export async function fetchMyVideos(params: FetchMineParams = {}): Promise<MinePage> {
  const { limit = 30, afterId = '' } = params;
  const fields: Record<string, string> = {
    limit: String(limit),
    order_by: 'index',
    sort_by: 'desc',
  };
  if (afterId) fields.after_id = afterId;

  const parsed = await feedRequest<MineVideosResponse>(
    '/my-videos',
    `${GOMMO_AUTH_BASE}/ai/videos`,
    fields,
  );

  const items = (parsed.data ?? []).map((it) => ({ ...it, type: 'video' as const }));
  const last = items.length ? items[items.length - 1] : undefined;
  return { items, nextAfterId: parsed.next_after_id ?? last?.id_base ?? '' };
}

export async function fetchMyImages(params: FetchMineParams = {}): Promise<MinePage> {
  const { limit = 30, afterId = '' } = params;
  const fields: Record<string, string> = {
    limit: String(limit),
    order_by: 'index',
    sort_by: 'desc',
  };
  if (afterId) fields.after_id = afterId;

  const parsed = await feedRequest<MineImagesResponse>(
    '/my-images',
    `${GOMMO_AUTH_BASE}/ai/images`,
    fields,
  );

  const raw = parsed.data ?? [];
  const items = raw.map(mapImageToFeedItem);
  const last = raw.length ? raw[raw.length - 1] : undefined;
  return { items, nextAfterId: parsed.next_after_id ?? last?.id_base ?? '' };
}

export function feedModelLabel(item: FeedItem): string {
  return item.modelInfo?.name?.trim() || item.model?.trim() || '';
}

export function feedThumb(item: FeedItem): string | null {
  if (item.thumbnail_url?.trim()) return item.thumbnail_url;
  const finished = item.resolutions?.find((r) => r.url);
  if (finished?.url) return finished.url;
  if (item.download_url?.trim()) return item.download_url;
  return null;
}

export function feedMediaUrl(item: FeedItem): string | null {
  const finished = item.resolutions?.find((r) => r.status === 'FINISH' && r.url);
  if (finished?.url) return finished.url;
  if (item.download_url?.trim()) return item.download_url;
  const anyRes = item.resolutions?.find((r) => r.url);
  return anyRes?.url || null;
}

export function feedSourceCount(item: FeedItem): number {
  return (item.images?.length || 0) + (item.objects?.length || 0);
}

export function formatFeedTime(value: string | number | undefined): string {
  if (value == null) return '';
  const ts = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(ts) || ts <= 0) return '';
  try {
    return new Date(ts * 1000).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}
