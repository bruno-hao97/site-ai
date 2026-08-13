import { useEffect, useState } from 'react';
import { feedThumb, fetchPublicVideos, type FeedItem } from '../services/feedApi';

function hasVisual(item: FeedItem): boolean {
  return Boolean(feedThumb(item));
}

/** Feed preview cố định cho landing — không infinite scroll. */
export function useLandingFeedPreview(limit = 16) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchPublicVideos({ limit })
      .then((page) => {
        if (!active) return;
        setItems(page.items.filter(hasVisual));
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [limit]);

  return { items, loading };
}
