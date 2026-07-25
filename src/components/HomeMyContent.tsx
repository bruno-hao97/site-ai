import { useCallback, useEffect, useRef, useState } from 'react';
import { isLoggedIn } from '../services/authStore';
import {
  feedMediaUrl,
  feedThumb,
  fetchMyImages,
  fetchMyVideos,
  type FeedItem,
  type MinePage,
} from '../services/feedApi';
import { UpstreamMeError } from '../services/upstreamMe';
import HomeFeedCard from './HomeFeedCard';
import HomeFeedPreview from './HomeFeedPreview';

export type MineFilter = 'all' | 'video' | 'image';

function mineTime(item: FeedItem): number {
  const v = item.created_time;
  const n = typeof v === 'string' ? Number(v) : v ?? 0;
  return Number.isFinite(n) ? Number(n) : 0;
}

export default function HomeMyContent({ filter }: { filter: MineFilter }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const videoAfter = useRef('');
  const imageAfter = useRef('');
  const videoDone = useRef(false);
  const imageDone = useRef(false);
  const seen = useRef<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
      const wantVideo = filter !== 'image' && !videoDone.current;
      const wantImage = filter !== 'video' && !imageDone.current;

      const [vid, img] = await Promise.all([
        wantVideo ? fetchMyVideos({ afterId: videoAfter.current, limit: 30 }) : Promise.resolve(null),
        wantImage ? fetchMyImages({ afterId: imageAfter.current, limit: 30 }) : Promise.resolve(null),
      ]);

      const fresh: FeedItem[] = [];
      const ingest = (
        page: MinePage | null,
        afterRef: React.MutableRefObject<string>,
        doneRef: React.MutableRefObject<boolean>,
      ) => {
        if (!page) return;
        for (const it of page.items) {
          if (!it.id_base || seen.current.has(it.id_base)) continue;
          if (!feedThumb(it) && !feedMediaUrl(it)) continue;
          seen.current.add(it.id_base);
          fresh.push(it);
        }
        const noProgress = !page.nextAfterId || page.nextAfterId === afterRef.current;
        afterRef.current = page.nextAfterId;
        if (!page.items.length || noProgress) doneRef.current = true;
      };

      ingest(vid, videoAfter, videoDone);
      ingest(img, imageAfter, imageDone);

      if (fresh.length) {
        setItems((prev) => [...prev, ...fresh].sort((a, b) => mineTime(b) - mineTime(a)));
      }

      const vDone = filter === 'image' || videoDone.current;
      const iDone = filter === 'video' || imageDone.current;
      if (vDone && iDone) setDone(true);
    } catch (err) {
      setError(err instanceof UpstreamMeError ? err.message : String(err));
      setDone(true);
    } finally {
      setLoading(false);
    }
  }, [loading, done, filter]);

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
            showProjectPicker
            showModelBadge
            authorFallback="Bạn"
          />
        ))}
      </div>

      {error && <p className="error feed-status">{error}</p>}
      {loading && <p className="muted feed-status">Đang tải…</p>}
      {!loading && !items.length && !error && (
        <p className="muted feed-status">Bạn chưa có nội dung nào.</p>
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
