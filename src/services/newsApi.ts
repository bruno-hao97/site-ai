import { GOMMO_AUTH_BASE, GOMMO_AUTH_PATH, UpstreamMeError } from './upstreamMe';
import { loadAuth } from './authStore';

export interface NewsAttachment {
  url: string;
  type: string;
}

export interface NewsItem {
  title: string;
  content: string;
  type: string;
  thumbnail: string;
  attachments: NewsAttachment[];
  is_pinned: string;
  is_new: string;
  id_base: string;
  created_at: string;
  updated_at?: string;
  publish_time?: string | null;
  tags?: unknown[];
}

interface NewsListResponse {
  success?: boolean;
  message?: string;
  data?: NewsItem[];
  runtime?: number;
}

async function newsPost<T>(
  path: string,
  accessToken: string,
  domain: string,
  extra: Record<string, string> = {},
): Promise<T> {
  const body = new URLSearchParams({
    access_token: accessToken.trim(),
    domain: domain.trim(),
    ...extra,
  }).toString();

  const res = await fetch(`${GOMMO_AUTH_BASE}${GOMMO_AUTH_PATH}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const text = await res.text();
  let parsed: T & { success?: boolean; message?: string };
  try {
    parsed = JSON.parse(text) as T & { success?: boolean; message?: string };
  } catch {
    throw new UpstreamMeError(text || `HTTP ${res.status}`, res.status);
  }

  if (!res.ok || parsed.success === false) {
    throw new UpstreamMeError(parsed.message || `HTTP ${res.status}`, res.status);
  }

  return parsed;
}

export function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

export function formatNewsDate(iso: string): string {
  try {
    return new Date(iso.replace(' ', 'T')).toLocaleDateString('vi-VN');
  } catch {
    return iso;
  }
}

export function sortNewsItems(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => {
    const pinA = a.is_pinned === '1' ? 1 : 0;
    const pinB = b.is_pinned === '1' ? 1 : 0;
    if (pinB !== pinA) return pinB - pinA;
    return new Date(b.created_at.replace(' ', 'T')).getTime()
      - new Date(a.created_at.replace(' ', 'T')).getTime();
  });
}

export async function fetchAllNews(limit = 5): Promise<NewsItem[]> {
  const auth = loadAuth();
  if (!auth?.access_token) throw new UpstreamMeError('Chưa đăng nhập', 401);
  const res = await newsPost<NewsListResponse>(
    '/news/getAll',
    auth.access_token,
    auth.domain,
    { limit: String(limit) },
  );
  return sortNewsItems(res.data ?? []);
}
