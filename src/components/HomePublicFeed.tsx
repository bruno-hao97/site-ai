import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ComposerLibraryPreviewModal, {
  type ComposerPreviewHandlers,
} from './ComposerLibraryPreviewModal';
import FeedMasonryCard from './FeedMasonryCard';
import { useLocale } from '../i18n';
import {
  feedMatchesCommunityType,
  feedMediaUrl,
  feedThumb,
  fetchPublicVideos,
  type CommunityTypeFilter,
  type FeedItem,
} from '../services/feedApi';
import { UpstreamMeError } from '../services/upstreamMe';
import {
  canOpenFeedPreview,
  feedPreviewKind,
  navigateFeedItemReuse,
} from '../utils/feedItemReuse';

function hasVisual(item: FeedItem): boolean {
  return Boolean(feedThumb(item) || feedMediaUrl(item));
}

/** Feed gợi ý / public — tab "Hướng cho bạn". */
export default function HomePublicFeed({
  typeFilter = 'all',
}: {
  typeFilter?: CommunityTypeFilter;
}) {
  const { t } = useLocale();
  const navigate = useNavigate();
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

    setLoading(true);
    setError('');
    try {
      const page = await fetchPublicVideos({
        limit: 30,
        afterId: afterIdRef.current,
      });

      const fresh = page.items.filter((it) => {
        if (!it.id_base || seenRef.current.has(it.id_base)) return false;
        if (!hasVisual(it)) return false;
        if (!feedMatchesCommunityType(it, typeFilter)) return false;
        seenRef.current.add(it.id_base);
        return true;
      });

      if (fresh.length) setItems((prev) => [...prev, ...fresh]);

      const noProgress = !page.nextAfterId || page.nextAfterId === afterIdRef.current;
      afterIdRef.current = page.nextAfterId;

      if (!page.items.length || noProgress) setDone(true);
    } catch (err) {
      setError(err instanceof UpstreamMeError ? err.message : String(err));
      setDone(true);
    } finally {
      setLoading(false);
    }
  }, [loading, done, typeFilter]);

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

  const visualItems = useMemo(() => items.filter(canOpenFeedPreview), [items]);
  const previewItem = previewIndex != null ? visualItems[previewIndex] : null;
  const previewKindValue = previewItem ? feedPreviewKind(previewItem) : 'video';

  const openItem = useCallback(
    (item: FeedItem) => {
      const idx = visualItems.findIndex((it) => it.id_base === item.id_base);
      if (idx >= 0) setPreviewIndex(idx);
    },
    [visualItems],
  );

  const previewHandlers = useMemo((): ComposerPreviewHandlers => {
    if (!previewItem) return {};
    const close = () => setPreviewIndex(null);
    const reuse = () => navigateFeedItemReuse(navigate, previewItem, close);
    return {
      onRegenerate: reuse,
      onReuse: reuse,
      onEdit: feedPreviewKind(previewItem) === 'video' ? reuse : undefined,
    };
  }, [previewItem, navigate]);

  return (
    <div className="home-feed">
      <div className="home-masonry home-masonry--feed">
        {items.map((item) => (
          <FeedMasonryCard key={item.id_base} item={item} onOpen={() => openItem(item)} />
        ))}
      </div>

      {previewIndex != null && visualItems.length > 0 && (
        <ComposerLibraryPreviewModal
          items={visualItems}
          index={Math.min(previewIndex, visualItems.length - 1)}
          kind={previewKindValue}
          layout="home"
          onClose={() => setPreviewIndex(null)}
          onNavigate={setPreviewIndex}
          handlers={previewHandlers}
        />
      )}

      {error && <p className="error feed-status">{error}</p>}
      {loading && <p className="muted feed-status">{t('home.feed.loading')}</p>}
      {!loading && !items.length && !error && (
        <p className="muted feed-status">{t('home.feed.emptyPublic')}</p>
      )}

      <div ref={sentinelRef} className="feed-sentinel" />
    </div>
  );
}
