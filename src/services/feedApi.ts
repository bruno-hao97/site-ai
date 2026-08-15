import { GOMMO_AUTH_BASE, GOMMO_AUTH_PATH, UpstreamMeError } from './upstreamMe';
import { clearAuth, loadAuth, resolveProjectId } from './authStore';
import { GOMMO_CHAT_CONFIG } from './gommoChatConfig';
import { buildDeviceInfo } from './audioVoices';
import { DEFAULT_DOMAIN, normalizeDomain } from './settingsStore';
import { listHistory, type HistoryEntry } from './historyStore';

async function feedRequest<T extends { success?: boolean; message?: string }>(
  gommoUrl: string,
  fields: Record<string, string>,
): Promise<T> {
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
  return parseFeedRes<T>(res, true);
}

/** Feed công khai — token tùy chọn (public-videos chạy được không Bearer). */
async function publicFeedRequest<T extends { success?: boolean; message?: string }>(
  gommoUrl: string,
  fields: Record<string, string>,
): Promise<T> {
  const auth = loadAuth();
  const body = new URLSearchParams({
    domain: normalizeDomain(auth?.domain || DEFAULT_DOMAIN),
    ...feedDeviceFields(),
    ...fields,
  });
  if (auth?.access_token?.trim()) {
    body.set('access_token', auth.access_token.trim());
  }
  const res = await fetch(gommoUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  return parseFeedRes<T>(res, Boolean(auth?.access_token));
}

async function parseFeedRes<T extends { success?: boolean; message?: string }>(
  res: Response,
  signedIn: boolean,
): Promise<T> {
  if (signedIn && (res.status === 401 || res.status === 403)) {
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
  name?: string;
  value?: string;
  width?: number;
  height?: number;
  ratio?: string;
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
  url_preview?: string;
  url?: string;
  prompt?: string;
  credit_fee?: number;
  like_count?: number;
  likes_count?: number;
  comments_count?: number;
  created_time?: string | number;
  author?: FeedAuthor;
  isMe?: boolean;
  file_size?: number;
  category_name?: string;
  server_ai?: string;
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

  const parsed = await publicFeedRequest<PublicVideosResponse>(
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

interface MyImageResolution {
  name?: string;
  value?: string;
  width?: number;
  height?: number;
  ratio?: string;
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
  resolutions?: MyImageResolution[];
  server_ai?: string;
  category_name?: string;
  file_size?: number;
}

function feedDeviceFields(): Record<string, string> {
  return {
    device_id: GOMMO_CHAT_CONFIG.deviceId,
    device_name: GOMMO_CHAT_CONFIG.deviceName,
    device_info: buildDeviceInfo('vi'),
  };
}

function mineFields(extra: Record<string, string>): Record<string, string> {
  const fields = { ...extra, ...feedDeviceFields() };
  const projectId = resolveProjectId();
  if (projectId && projectId !== 'default') {
    fields.project_id = projectId;
  }
  return fields;
}

interface MineImagesResponse {
  success?: boolean;
  message?: string;
  data?: MyImageItem[];
  next_after_id?: string;
}

function mapImageToFeedItem(img: MyImageItem): FeedItem {
  const resolutions = img.resolutions?.map((r) => ({
    type: r.name || r.value || 'image',
    name: r.name,
    value: r.value,
    width: r.width,
    height: r.height,
    ratio: r.ratio,
    status: 'FINISH',
    url: img.url,
  }));
  const resolutionName = img.resolutions?.[0]?.name || img.resolutions?.[0]?.value;
  return {
    id_base: img.id_base,
    type: 'image',
    status: img.status || 'SUCCESS',
    prompt: img.prompt,
    model: img.model,
    ratio: img.ratio || img.resolutions?.[0]?.ratio,
    resolution: resolutionName || img.resolution,
    resolutions,
    thumbnail_url: img.url_preview || img.url,
    download_url: img.url,
    created_time: img.created_at,
    isMe: img.isMe,
    file_size: img.file_size,
    category_name: img.category_name,
    server_ai: img.server_ai,
  };
}

export async function fetchMyVideos(params: FetchMineParams = {}): Promise<MinePage> {
  const { limit = 30, afterId = '' } = params;
  const fields = mineFields({
    limit: String(limit),
    order_by: 'index',
    sort_by: 'desc',
  });
  if (afterId) fields.after_id = afterId;

  const parsed = await feedRequest<MineVideosResponse>(
    `${GOMMO_AUTH_BASE}/ai/videos`,
    fields,
  );

  const items = (parsed.data ?? []).map((it) => ({ ...it, type: 'video' as const }));
  const last = items.length ? items[items.length - 1] : undefined;
  return { items, nextAfterId: parsed.next_after_id ?? last?.id_base ?? '' };
}

export async function fetchMyImages(params: FetchMineParams = {}): Promise<MinePage> {
  const { limit = 30, afterId = '' } = params;
  const fields = mineFields({
    limit: String(limit),
    order_by: 'index',
    sort_by: 'desc',
  });
  if (afterId) fields.after_id = afterId;

  const parsed = await feedRequest<MineImagesResponse>(
    `${GOMMO_AUTH_BASE}/ai/images`,
    fields,
  );

  const raw = parsed.data ?? [];
  const items = raw.map(mapImageToFeedItem);
  const last = raw.length ? raw[raw.length - 1] : undefined;
  return { items, nextAfterId: parsed.next_after_id ?? last?.id_base ?? '' };
}

function isVideoMediaUrl(url: string): boolean {
  const base = url.split('?')[0].split('#')[0].toLowerCase();
  return /\.(mp4|webm|mov|m4v|m3u8|avi)(\?|$)/i.test(base) || base.includes('/video/');
}

export function isAudioMediaUrl(url: string): boolean {
  const base = url.split('?')[0].split('#')[0].toLowerCase();
  return /\.(mp3|wav|ogg|m4a|aac|flac|opus)(\?|$)/i.test(base) || base.includes('/audio/');
}

export function feedModelLabel(item: FeedItem): string {
  return item.modelInfo?.name?.trim() || item.model?.trim() || '';
}

export function feedThumb(item: FeedItem): string | null {
  const t = (item.type || '').toLowerCase();
  const media = item.download_url || item.resolutions?.find((r) => r.url)?.url || '';
  const looksAudio =
    t === 'music' || t === 'tts' || t.includes('audio') || (media && isAudioMediaUrl(media));

  if (looksAudio) {
    const cover = item.thumbnail_url?.trim() || item.url_preview?.trim();
    if (cover && !isAudioMediaUrl(cover) && !isVideoMediaUrl(cover)) return cover;
    return null;
  }

  if (item.thumbnail_url?.trim()) return item.thumbnail_url;
  const finished = item.resolutions?.find((r) => r.url);
  if (finished?.url && !isAudioMediaUrl(finished.url)) return finished.url;
  if (item.download_url?.trim() && !isAudioMediaUrl(item.download_url)) return item.download_url;
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

/** Xóa ảnh/video trên Gommo (POST /api/apps/go-mmo/ai/post-delete). */
export async function deleteFeedPost(idBase: string): Promise<void> {
  const id = idBase.trim();
  if (!id) throw new UpstreamMeError('Thiếu id_base', 400);

  const fields = { id_base: id, ...feedDeviceFields() };
  const parsed = await feedRequest<{ success?: boolean; message?: string }>(
    `${GOMMO_AUTH_BASE}${GOMMO_AUTH_PATH}/ai/post-delete`,
    fields,
  );
  if (parsed.success === false) {
    throw new UpstreamMeError(parsed.message || 'Xóa thất bại');
  }
}

function historyEntryToFeedItem(entry: HistoryEntry): FeedItem {
  const url = (entry.resultUrl || '').trim();
  const feedType = entry.type;
  const cover = (entry.meta?.coverUrl || entry.meta?.cover_url || '').trim();
  const visualThumb =
    feedType === 'image' || feedType === 'video' || feedType === 'avatar-lipsync'
      ? url || undefined
      : cover || undefined;
  return {
    id_base: entry.id,
    type: feedType,
    status: url ? 'FINISH' : 'processing',
    prompt: entry.prompt || undefined,
    model: entry.modelSlug || entry.modelName || undefined,
    download_url: url || undefined,
    thumbnail_url: visualThumb,
    created_time: entry.createdAt
      ? Math.floor(new Date(entry.createdAt).getTime() / 1000)
      : undefined,
    duration: entry.meta?.duration || undefined,
    resolutions: url ? [{ type: feedType, status: 'FINISH', url }] : undefined,
  };
}

function paginateFeedItems(items: FeedItem[], params: FetchMineParams): MinePage {
  const { limit = 30, afterId = '' } = params;
  let start = 0;
  if (afterId) {
    const idx = items.findIndex((i) => i.id_base === afterId);
    start = idx >= 0 ? idx + 1 : items.length;
  }
  const slice = items.slice(start, start + limit);
  const last = slice[slice.length - 1];
  return { items: slice, nextAfterId: last?.id_base ?? '' };
}

/** Job nhạc — local history (site-ai direct Gommo). */
export async function fetchMyMusic(params: FetchMineParams = {}): Promise<MinePage> {
  const items = listHistory('music')
    .map(historyEntryToFeedItem)
    .sort((a, b) => mineFeedTime(b) - mineFeedTime(a));
  return paginateFeedItems(items, params);
}

/** Job TTS / âm thanh — local history. */
export async function fetchMyAudio(params: FetchMineParams = {}): Promise<MinePage> {
  const items = listHistory('tts')
    .map(historyEntryToFeedItem)
    .sort((a, b) => mineFeedTime(b) - mineFeedTime(a));
  return paginateFeedItems(items, params);
}

export function feedIsAudioItem(item: FeedItem): boolean {
  const t = (item.type || '').toLowerCase();
  if (t === 'music' || t === 'tts' || t.includes('audio')) return true;
  const media = feedMediaUrl(item);
  return Boolean(media && isAudioMediaUrl(media));
}

function mineFeedTime(item: FeedItem): number {
  const v = item.created_time;
  const n = typeof v === 'string' ? Number(v) : v ?? 0;
  return Number.isFinite(n) ? Number(n) : 0;
}

export function feedPosterUrl(item: FeedItem): string | null {
  const thumb = feedThumb(item);
  if (thumb && !isVideoMediaUrl(thumb)) return thumb;
  return null;
}

export function feedDisplayQty(item: FeedItem): number {
  const refs = feedSourceCount(item);
  const resCount = item.resolutions?.filter((r) => r.url || r.status === 'FINISH').length ?? 0;
  return Math.max(1, refs > 1 ? refs : resCount > 1 ? resCount : refs || 1);
}

export function feedIsFailed(item: FeedItem): boolean {
  const media = feedMediaUrl(item);
  const s = (item.status || '').toUpperCase();
  if (media && (s.includes('SUCCESS') || s === 'FINISH' || s === 'FINISHED' || s === '')) {
    return false;
  }
  if (!s) return false;
  if (s.includes('SUCCESS') || s === 'FINISH' || s === 'FINISHED' || s.includes('PROCESSING')) {
    return false;
  }
  return (
    s.includes('FAIL')
    || s.includes('ERROR')
    || s.includes('REJECT')
    || s.includes('CANCEL')
    || s.includes('BLOCK')
    || s.includes('NSFW')
    || s.includes('DENIED')
  );
}

export function feedIsDisplayable(item: FeedItem): boolean {
  if (feedThumb(item) || feedMediaUrl(item)) return true;
  if (feedIsFailed(item)) return true;
  const s = (item.status || '').toUpperCase();
  return s.includes('PROCESS') || s.includes('PENDING') || s.includes('QUEUE');
}

export type CommunityTypeFilter = 'all' | 'video' | 'image' | 'music' | 'tts';

export type LibraryStatusFilter = 'all' | 'success' | 'failed';

export function feedMatchesCommunityType(
  item: FeedItem,
  filter: CommunityTypeFilter,
): boolean {
  if (filter === 'all') return true;
  const t = (item.type || '').toLowerCase();
  if (filter === 'video') return t === 'video' || t === 'avatar-lipsync';
  if (filter === 'image') return t === 'image';
  if (filter === 'music') return t === 'music';
  if (filter === 'tts') {
    if (t === 'tts') return true;
    return feedIsAudioItem(item) && t !== 'music';
  }
  return true;
}

export function feedMatchesLibraryStatus(
  item: FeedItem,
  status: LibraryStatusFilter,
): boolean {
  if (status === 'all') return feedIsDisplayable(item);
  if (status === 'failed') return feedIsFailed(item);
  return feedIsDisplayable(item) && !feedIsFailed(item) && Boolean(feedMediaUrl(item) || feedThumb(item));
}
