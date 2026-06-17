import { GOMMO_AUTH_BASE, UpstreamMeError } from './upstreamMe';

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
  accessToken: string;
  domain: string;
  limit?: number;
  privacy?: string;
  projectId?: string;
  afterVideoId?: string;
  afterImageId?: string;
}

export async function fetchNewsfeed(params: FetchFeedParams): Promise<FeedPage> {
  const {
    accessToken,
    domain,
    limit = 30,
    privacy = 'PUBLIC',
    projectId = 'default',
    afterVideoId = '',
    afterImageId = '',
  } = params;

  const body = new URLSearchParams({
    access_token: accessToken.trim(),
    domain: domain.trim(),
    limit: String(limit),
    project_id: projectId,
    privacy,
  });
  if (afterVideoId) body.set('after_video_id', afterVideoId);
  if (afterImageId) body.set('after_image_id', afterImageId);

  const res = await fetch(`${GOMMO_AUTH_BASE}/ai/newfeeds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const text = await res.text();
  let parsed: FeedResponse;
  try {
    parsed = JSON.parse(text) as FeedResponse;
  } catch {
    throw new UpstreamMeError(text || `HTTP ${res.status}`, res.status);
  }

  if (!res.ok || parsed.success === false) {
    throw new UpstreamMeError(parsed.message || `HTTP ${res.status}`, res.status);
  }

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
  accessToken: string;
  domain: string;
  type?: string;
  publicPrompt?: boolean;
  limit?: number;
  afterId?: string;
}

export async function fetchPublicVideos(params: FetchPublicVideosParams): Promise<PublicVideosPage> {
  const {
    accessToken,
    domain,
    type = 'public_home',
    publicPrompt = false,
    limit = 30,
    afterId = '',
  } = params;

  const body = new URLSearchParams({
    access_token: accessToken.trim(),
    domain: domain.trim(),
    type,
    public_prompt: String(publicPrompt),
    limit: String(limit),
  });
  if (afterId) body.set('after_id', afterId);

  const res = await fetch(`${GOMMO_AUTH_BASE}/api/apps/go-mmo/ai/public-videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const text = await res.text();
  let parsed: PublicVideosResponse;
  try {
    parsed = JSON.parse(text) as PublicVideosResponse;
  } catch {
    throw new UpstreamMeError(text || `HTTP ${res.status}`, res.status);
  }

  if (!res.ok || parsed.success === false) {
    throw new UpstreamMeError(parsed.message || `HTTP ${res.status}`, res.status);
  }

  const items = parsed.data ?? [];
  const last = items.length ? items[items.length - 1] : undefined;
  const nextAfterId = parsed.next_after_id ?? parsed.after_id ?? last?.id_base ?? '';

  return { items, nextAfterId };
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
