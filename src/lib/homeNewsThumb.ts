import { feedThumb, type FeedItem } from '../services/feedApi';

/** Ảnh cover tĩnh cho tin sản phẩm (SVG onboarding — luôn có sẵn). */
export const STATIC_NEWS_THUMB: Record<string, string> = {
  quickstart: '/onboarding/workflow-slide-1.svg',
  library: '/onboarding/workflow-slide-4.svg',
  workflow: '/onboarding/workflow-slide-2.svg',
  chat: '/onboarding/workflow-slide-3.svg',
  models: '/onboarding/workflow-slide-4.svg',
  audio: '/onboarding/audio-slide-1.svg',
  pricing: '/onboarding/audio-slide-3.svg',
};

export function probeImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

function feedItemModelSlug(item: FeedItem): string {
  return (item.modelInfo?.model || item.model || '').trim();
}

/** Map model slug → thumb từ feed public (item mới nhất có visual). */
export function buildFeedThumbByModel(items: FeedItem[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of items) {
    const slug = feedItemModelSlug(item);
    if (!slug || map.has(slug)) continue;
    const thumb = feedThumb(item);
    if (thumb) map.set(slug, thumb);
  }
  return map;
}

/** Parse ảnh đầu tiên từ content_html catalog (nếu upstream điền sau này). */
export function thumbFromContentHtml(html: string | undefined): string | null {
  const raw = html?.trim();
  if (!raw) return null;
  const match = raw.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1]?.trim() || null;
}

export function resolveNewsThumbCandidate(
  card: { thumb?: string; modelSlug?: string },
  feedMap: Map<string, string>,
): string | null {
  if (card.thumb?.trim()) return card.thumb.trim();
  if (card.modelSlug) {
    const fromFeed = feedMap.get(card.modelSlug);
    if (fromFeed) return fromFeed;
  }
  return null;
}
