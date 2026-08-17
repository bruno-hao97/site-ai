import { useEffect, useMemo } from 'react';
import { useModelCatalog } from './useModelCatalog';
import { useLocale } from '../i18n';
import type { TranslationKey } from '../i18n/types';
import { getActiveProductNews, type ProductNewsItem } from '../lib/homeProductNews';
import { STATIC_NEWS_THUMB } from '../lib/homeNewsThumb';
import {
  catalogEntryToNewsCard,
  listTopModelsByCategory,
  PER_CATEGORY_MODEL_LIMIT,
  WHATS_NEW_MAX_TOTAL,
  type HomeNewsCardView,
} from '../lib/homeModelNews';

function staticItemToNewsCard(
  item: ProductNewsItem,
  t: (key: TranslationKey) => string,
): HomeNewsCardView {
  return {
    id: item.id,
    source: 'static',
    kind: item.kind,
    accent: item.kind,
    href: item.href,
    title: t(item.titleKey),
    desc: t(item.descKey),
    showNewBadge: Boolean(item.pinned),
    pinned: item.pinned,
    thumb: item.thumb ?? STATIC_NEWS_THUMB[item.id],
  };
}

export function useHomeNewsCards(maxTotal = WHATS_NEW_MAX_TOTAL) {
  const { catalog, loading, error } = useModelCatalog({
    force: true,
    retryOnEmpty: true,
    maxRetries: 3,
  });
  const { t } = useLocale();

  const modelEntries = useMemo(
    () => listTopModelsByCategory(catalog, PER_CATEGORY_MODEL_LIMIT),
    [catalog],
  );

  const cards = useMemo(() => {
    const modelCards = modelEntries.map((entry) => catalogEntryToNewsCard(entry, t));

    if (loading) return modelCards;

    let staticItems = getActiveProductNews(maxTotal);
    if (modelCards.length) {
      staticItems = staticItems.filter((item) => item.id !== 'models');
    }

    const staticCards = staticItems.map((item) => staticItemToNewsCard(item, t));
    const remaining = Math.max(0, maxTotal - modelCards.length);
    return [...modelCards, ...staticCards.slice(0, remaining)];
  }, [modelEntries, maxTotal, t, loading]);

  useEffect(() => {
    if (!import.meta.env.DEV || loading) return;
    console.log('[home whats-new]', {
      catalog: catalog.length,
      modelCards: modelEntries.length,
      totalCards: cards.length,
      error: error || undefined,
    });
  }, [catalog.length, modelEntries.length, cards.length, loading, error]);

  return {
    cards,
    loading,
    error,
    modelCount: modelEntries.length,
    catalogCount: catalog.length,
  };
}

export type { HomeNewsCardView };
