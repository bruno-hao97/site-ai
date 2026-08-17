import type { TranslationKey } from '../i18n/types';

export type ProductNewsKind = 'feature' | 'model' | 'pricing' | 'tip';

export interface ProductNewsItem {
  id: string;
  kind: ProductNewsKind;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  href: string;
  thumb?: string;
  publishedAt: string;
  pinned?: boolean;
}

/** Tin sản phẩm Trung tâm AI — thêm entry + i18n khi ship tính năng. */
export const HOME_PRODUCT_NEWS: ProductNewsItem[] = [
  {
    id: 'quickstart',
    kind: 'feature',
    titleKey: 'home.news.quickstart.title',
    descKey: 'home.news.quickstart.desc',
    href: '/video',
    publishedAt: '2026-08-17',
    pinned: true,
  },
  {
    id: 'library',
    kind: 'feature',
    titleKey: 'home.news.library.title',
    descKey: 'home.news.library.desc',
    href: '/library',
    publishedAt: '2026-08-17',
  },
  {
    id: 'workflow',
    kind: 'feature',
    titleKey: 'home.news.workflow.title',
    descKey: 'home.news.workflow.desc',
    href: '/workflow',
    publishedAt: '2026-08-15',
  },
  {
    id: 'chat',
    kind: 'feature',
    titleKey: 'home.news.chat.title',
    descKey: 'home.news.chat.desc',
    href: '/chat',
    publishedAt: '2026-08-14',
  },
  {
    id: 'models',
    kind: 'model',
    titleKey: 'home.news.models.title',
    descKey: 'home.news.models.desc',
    href: '/models',
    publishedAt: '2026-08-12',
  },
  {
    id: 'audio',
    kind: 'feature',
    titleKey: 'home.news.audio.title',
    descKey: 'home.news.audio.desc',
    href: '/audio',
    publishedAt: '2026-08-10',
  },
  {
    id: 'pricing',
    kind: 'pricing',
    titleKey: 'home.news.pricing.title',
    descKey: 'home.news.pricing.desc',
    href: '/pricing',
    publishedAt: '2026-08-01',
  },
];

const MAX_AGE_DAYS = 120;

export function getActiveProductNews(limit = 8): ProductNewsItem[] {
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  return [...HOME_PRODUCT_NEWS]
    .filter((item) => new Date(item.publishedAt).getTime() >= cutoff)
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    })
    .slice(0, limit);
}
