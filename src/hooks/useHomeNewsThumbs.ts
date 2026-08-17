import { useEffect, useState } from 'react';
import type { HomeNewsCardView } from '../lib/homeModelNews';
import {
  buildFeedThumbByModel,
  probeImage,
  resolveNewsThumbCandidate,
} from '../lib/homeNewsThumb';
import { fetchPublicVideos } from '../services/feedApi';

/** Verify thumb candidates (static + feed) — chỉ trả URL đã load OK. */
export function useHomeNewsThumbs(cards: HomeNewsCardView[], enabled: boolean) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  const cardKey = cards
    .map((c) => `${c.id}\0${c.thumb ?? ''}\0${c.modelSlug ?? ''}`)
    .join('|');

  useEffect(() => {
    if (!enabled || cards.length === 0) {
      setThumbs({});
      return;
    }

    let cancelled = false;

    void (async () => {
      let feedMap = new Map<string, string>();
      const needsFeed = cards.some((c) => c.modelSlug && !c.thumb);
      if (needsFeed) {
        try {
          const page = await fetchPublicVideos({ limit: 60 });
          if (!cancelled) feedMap = buildFeedThumbByModel(page.items);
        } catch {
          /* feed optional */
        }
      }

      if (cancelled) return;

      const results = await Promise.all(
        cards.map(async (card) => {
          const candidate = resolveNewsThumbCandidate(card, feedMap);
          if (!candidate) return { id: card.id, url: null as string | null };
          const ok = await probeImage(candidate);
          return { id: card.id, url: ok ? candidate : null };
        }),
      );

      if (cancelled) return;

      const next: Record<string, string> = {};
      for (const { id, url } of results) {
        if (url) next[id] = url;
      }
      setThumbs(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [cardKey, cards, enabled]);

  return thumbs;
}
