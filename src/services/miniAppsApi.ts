import { clearAuth, loadAuth } from './authStore';
import { platformDeviceFields } from './gommoDevice';
import { UpstreamMeError } from './upstreamMe';

const PLATFORM_V2_BASE = '/api/v2';

// ─── Data model (spec §4) ───────────────────────────────────────────────────

export interface MiniAppAuthor {
  username?: string;
  name?: string;
  avatar?: string;
}

export interface MiniAppReview {
  id?: string;
  rating?: number;
  score?: number;
  reason?: string;
  comment?: string;
  content?: string;
  message?: string;
  user?: MiniAppAuthor;
  authorInfo?: MiniAppAuthor;
  created_at?: string;
  created_time?: string | number;
}

export interface MiniAppSummary {
  price_credit?: number;
  is_free?: boolean;
  usage_count?: number;
  marketplace_score?: number;
  votes?: {
    rating_avg?: number;
    rating_count?: number;
    items?: MiniAppReview[];
    list?: MiniAppReview[];
  };
}

export interface MiniAppModeration {
  status?: string;
  reason?: string;
}

export interface MiniAppItem {
  id_base: string;
  name: string;
  slug: string;
  description: string;
  avatar_url?: string;
  banner_url?: string;
  tags?: string[];
  privacy?: string;
  status?: string;
  is_free?: string | boolean;
  price_credit?: string | number;
  billing_period?: string;
  rating_avg?: string | number;
  rating_count?: string | number;
  marketplace_score?: string | number;
  usage_count?: string | number;
  weekly_use_count?: string | number;
  weekly_view_count?: string | number;
  is_owner?: boolean;
  is_purchased?: boolean;
  created_time?: string | number;
  updated_time?: string | number;
  authorInfo?: MiniAppAuthor;
  summary?: MiniAppSummary;
  moderation?: MiniAppModeration;
  gallery?: string[];
  detail_description?: string;
  long_description?: string;
  reviews?: MiniAppReview[];
  rating_list?: MiniAppReview[];
  votes_list?: MiniAppReview[];
  entitlement?: {
    is_purchased?: boolean;
    is_owner?: boolean;
  };
}

/** Card UI — mapped từ MiniAppItem. */
export interface MarketplaceApp {
  id: string;
  title: string;
  description: string;
  rating: number;
  marketplaceScore: number;
  free: boolean;
  accent: string;
  imageUrl?: string;
  priceCredit?: number;
  billingPeriod?: string;
  slug?: string;
  raw?: MiniAppItem;
}

export type MarketplaceTabType =
  | 'all'
  | 'mine'
  | 'purchased'
  | 'newest'
  | 'best_selling'
  | 'price_high'
  | 'price_low';

export const MARKETPLACE_TABS: ReadonlyArray<{
  id: MarketplaceTabType;
  label: string;
  sectionTitle: string;
}> = [
  { id: 'all', label: 'Tất cả', sectionTitle: 'TOP ỨNG DỤNG MIỄN PHÍ' },
  { id: 'mine', label: 'của tôi', sectionTitle: 'CỦA TÔI' },
  { id: 'purchased', label: 'mua', sectionTitle: 'ĐÃ MUA' },
  { id: 'newest', label: 'mới nhất', sectionTitle: 'MỚI NHẤT' },
  { id: 'best_selling', label: 'bán chạy', sectionTitle: 'BÁN CHẠY' },
  { id: 'price_high', label: 'giá cao', sectionTitle: 'GIÁ CAO' },
  { id: 'price_low', label: 'giá thấp', sectionTitle: 'GIÁ THẤP' },
];

interface PlatformEnvelope<T = unknown> {
  success?: boolean;
  message?: string;
  data?: T;
}

interface MarketplaceData {
  items?: MiniAppItem[];
}

interface VotesData {
  summary?: {
    rating_avg?: number;
    rating_count?: number;
    score?: number;
    total?: number;
    stars?: Record<string, number>;
  };
  items?: MiniAppReview[];
  list?: MiniAppReview[];
}

const ACCENT_PALETTE = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4'];

// ─── Helpers (spec §4) ──────────────────────────────────────────────────────

function parseNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseTime(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
    const d = Date.parse(value);
    if (Number.isFinite(d)) return d;
  }
  return 0;
}

export function isMiniAppFree(app: Pick<MiniAppItem, 'is_free' | 'summary'>): boolean {
  if (app.summary?.is_free === true) return true;
  const v = app.is_free;
  return v === true || v === '1';
}

export function miniAppRating(app: MiniAppItem): number {
  return (
    parseNumber(app.summary?.votes?.rating_avg) ||
    parseNumber(app.rating_avg) ||
    0
  );
}

export function miniAppScore(app: MiniAppItem): number {
  return (
    parseNumber(app.summary?.marketplace_score) ||
    parseNumber(app.marketplace_score) ||
    miniAppRating(app)
  );
}

export function miniAppPriceCredit(app: MiniAppItem): number {
  return parseNumber(app.summary?.price_credit ?? app.price_credit, 0);
}

export function formatMiniAppPrice(app: Pick<MiniAppItem, 'is_free' | 'summary' | 'price_credit' | 'billing_period'>): string {
  if (isMiniAppFree(app)) return 'Free';
  const credits = miniAppPriceCredit(app as MiniAppItem);
  if (!credits) return 'Free';
  const period = app.billing_period?.trim();
  if (period && period !== 'lifetime') return `${credits} credit / ${period}`;
  return `${credits} credit`;
}

function isPublicLive(app: MiniAppItem): boolean {
  const privacy = (app.privacy || 'PUBLIC').toUpperCase();
  const status = (app.status || 'LIVE').toUpperCase();
  return privacy === 'PUBLIC' && status === 'LIVE';
}

function isMine(app: MiniAppItem): boolean {
  return Boolean(app.is_owner || app.entitlement?.is_owner);
}

function isPurchased(app: MiniAppItem): boolean {
  return Boolean(app.is_purchased || app.entitlement?.is_purchased);
}

function accentFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length];
}

function resolveMiniAppImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return url;
}

export function mapMiniAppToMarketplaceApp(item: MiniAppItem): MarketplaceApp | null {
  const id = item.id_base?.trim();
  if (!id) return null;

  const free = isMiniAppFree(item);
  const priceCredit = miniAppPriceCredit(item);

  return {
    id,
    title: item.name?.trim() || 'Mini App',
    description: item.description?.trim() || '',
    rating: miniAppRating(item),
    marketplaceScore: miniAppScore(item),
    free,
    accent: accentFromId(id),
    imageUrl: resolveMiniAppImageUrl(item.avatar_url || item.banner_url),
    priceCredit: free ? 0 : priceCredit,
    billingPeriod: item.billing_period?.trim() || undefined,
    slug: item.slug?.trim() || undefined,
    raw: item,
  };
}

/** Filter + sort tab — client-side sau 1 lần gọi marketplace. */
export function filterMarketplaceByTab(items: MiniAppItem[], tab: MarketplaceTabType): MiniAppItem[] {
  switch (tab) {
    case 'all':
      return [...items]
        .filter(isPublicLive)
        .sort((a, b) => miniAppScore(b) - miniAppScore(a));
    case 'mine':
      return items.filter(isMine);
    case 'purchased':
      return items.filter(isPurchased);
    case 'newest':
      return [...items].sort(
        (a, b) =>
          parseTime(b.updated_time ?? b.created_time) -
          parseTime(a.updated_time ?? a.created_time),
      );
    case 'best_selling':
      return [...items].sort(
        (a, b) =>
          parseNumber(b.weekly_use_count ?? b.usage_count) -
          parseNumber(a.weekly_use_count ?? a.usage_count),
      );
    case 'price_high':
      return [...items].sort((a, b) => miniAppPriceCredit(b) - miniAppPriceCredit(a));
    case 'price_low':
      return [...items].sort((a, b) => miniAppPriceCredit(a) - miniAppPriceCredit(b));
    default:
      return items;
  }
}

export function filterMarketplaceApps(items: MarketplaceApp[], query: string): MarketplaceApp[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (app) =>
      app.title.toLowerCase().includes(q) ||
      app.description.toLowerCase().includes(q) ||
      app.slug?.toLowerCase().includes(q),
  );
}

export function formatMarketplacePrice(app: MarketplaceApp): string {
  if (app.raw) return formatMiniAppPrice(app.raw);
  if (app.free || !app.priceCredit) return 'Free';
  const period = app.billingPeriod;
  if (period && period !== 'lifetime') return `${app.priceCredit} credit / ${period}`;
  return `${app.priceCredit} credit`;
}

// ─── Platform POST wrapper (spec §7) ────────────────────────────────────────

async function postPlatformForm<T>(endpoint: string, fields: Record<string, string>): Promise<T> {
  const auth = loadAuth();
  const token = auth?.access_token?.trim();
  if (!auth || !token) throw new UpstreamMeError('Chưa đăng nhập', 401);

  const body = new URLSearchParams({
    ...platformDeviceFields(),
    domain: auth.domain.trim(),
    language: 'VI',
    access_token: token,
    ...fields,
  }).toString();

  const res = await fetch(`${PLATFORM_V2_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  if (res.status === 401 || res.status === 403) {
    clearAuth();
    if (typeof window !== 'undefined') window.location.href = '/login';
  }

  const text = await res.text();
  let parsed: PlatformEnvelope<T>;
  try {
    parsed = JSON.parse(text) as PlatformEnvelope<T>;
  } catch {
    throw new UpstreamMeError(text || `HTTP ${res.status}`, res.status);
  }

  if (!res.ok || parsed.success === false) {
    throw new UpstreamMeError(parsed.message || `HTTP ${res.status}`, res.status);
  }

  return (parsed.data ?? parsed) as T;
}

function normalizeMiniAppItems(data: MarketplaceData | MiniAppItem[] | null | undefined): MiniAppItem[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

// ─── Public API (spec §2, §3) ─────────────────────────────────────────────────

/** POST /api/v2/mini-apps action=marketplace */
export async function fetchMarketplaceMiniApps(search = ''): Promise<MiniAppItem[]> {
  const auth = loadAuth();
  if (!auth?.access_token?.trim()) return [];

  const data = await postPlatformForm<MarketplaceData | MiniAppItem[]>('mini-apps', {
    action: 'marketplace',
    search: search.trim(),
  });

  return normalizeMiniAppItems(data);
}

/** TOP MIỄN PHÍ strip — public LIVE, sort score, top N. */
export async function fetchTopFreeMarketplaceApps(limit = 4): Promise<MarketplaceApp[]> {
  const items = await fetchMarketplaceMiniApps('');
  return items
    .filter(isPublicLive)
    .sort((a, b) => miniAppScore(b) - miniAppScore(a))
    .slice(0, limit)
    .map(mapMiniAppToMarketplaceApp)
    .filter((app): app is MarketplaceApp => app != null);
}

/** Modal tab — fetch 1 lần (có search), filter tab client-side. */
export async function fetchMarketplaceApps(options: {
  tab: MarketplaceTabType;
  search?: string;
}): Promise<MarketplaceApp[]> {
  const raw = await fetchMarketplaceMiniApps(options.search ?? '');
  const tabbed = filterMarketplaceByTab(raw, options.tab);
  return tabbed
    .map(mapMiniAppToMarketplaceApp)
    .filter((app): app is MarketplaceApp => app != null);
}

/** POST /api/v2/mini-apps action=get */
export async function fetchMiniAppInfo(idBase: string): Promise<MiniAppItem> {
  const data = await postPlatformForm<{ item?: MiniAppItem; info?: MiniAppItem } & MiniAppItem>(
    'mini-apps',
    {
      action: 'get',
      id_base: idBase,
      mini_app_id: idBase,
    },
  );

  const merged = {
    ...(data.item ?? data.info ?? data),
    id_base: idBase,
  } as MiniAppItem;

  return merged;
}

/** POST /api/v2/votes action=list */
export async function fetchMiniAppVotes(idBase: string, limit = 50): Promise<VotesData> {
  return postPlatformForm<VotesData>('votes', {
    action: 'list',
    target_type: 'mini_app',
    target_id: idBase,
    limit: String(limit),
  });
}

/** Deep link runtime — /chat?mini_app={id_base} */
export function miniAppChatUrl(idBase: string): string {
  return `/chat?mini_app=${encodeURIComponent(idBase)}`;
}
