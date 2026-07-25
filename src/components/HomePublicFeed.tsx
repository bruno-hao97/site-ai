import { useCallback, useEffect, useRef, useState } from 'react';
import { isLoggedIn } from '../services/authStore';
import { feedThumb, fetchPublicVideos, type FeedItem } from '../services/feedApi';
import { UpstreamMeError } from '../services/upstreamMe';
import HomeFeedCard from './HomeFeedCard';
import HomeFeedPreview from './HomeFeedPreview';

/** Feed gợi ý / public — dùng cho tab "Hướng cho bạn". */
export default function HomePublicFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const afterIdRef = useRef('');
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  const loadMore = useCallback(async () => {
    if (loading || done) return;
    if (!isLoggedIn()) {
      setError('Chưa đăng nhập.');
      setDone(true);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const page = await fetchPublicVideos({
        limit: 30,
        afterId: afterIdRef.current,
      });

      const fresh = page.items.filter((it) => {
        if (!it.id_base || seenRef.current.has(it.id_base)) return false;
        if (!feedThumb(it)) return false;
        seenRef.current.add(it.id_base);
        return true;
      });

      setItems((prev) => [...prev, ...fresh]);

      const noProgress = !page.nextAfterId || page.nextAfterId === afterIdRef.current;
      afterIdRef.current = page.nextAfterId;

      if (!page.items.length || noProgress || !fresh.length) setDone(true);
    } catch (err) {
      setError(err instanceof UpstreamMeError ? err.message : String(err));
      setDone(true);
    } finally {
      setLoading(false);
    }
  }, [loading, done]);

  useEffect(() => {
    void loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: '600px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const openPreview = (item: FeedItem) => {
    const idx = items.findIndex((it) => it.id_base === item.id_base);
    if (idx >= 0) setPreviewIndex(idx);
  };

  return (
    <div className="home-feed">
      <div className="home-masonry">
        {items.map((item) => (
          <HomeFeedCard
            key={item.id_base}
            item={item}
            onOpenPreview={openPreview}
            showModelBadge
          />
        ))}
      </div>

      {error && <p className="error feed-status">{error}</p>}
      {loading && <p className="muted feed-status">Đang tải…</p>}
      {!loading && !items.length && !error && (
        <p className="muted feed-status">Chưa có nội dung gợi ý.</p>
      )}

      <div ref={sentinelRef} className="feed-sentinel" />

      {previewIndex != null && (
        <HomeFeedPreview
          items={items}
          index={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onNavigate={setPreviewIndex}
        />
      )}
    </div>
  );
}
