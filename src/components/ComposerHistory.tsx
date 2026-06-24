import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Check, ChevronDown, Clock, Search, X } from 'lucide-react';
import { fetchMyImages, fetchMyVideos, type FeedItem } from '../services/feedApi';
import type { JobType } from '../services/api';
import ProjectPicker from './ProjectPicker';
import type { ProjectItemType } from '../services/projectStore';

function projectType(jobType: JobType): ProjectItemType {
  if (jobType === 'image') return 'image';
  if (jobType === 'video' || jobType === 'avatar-lipsync') return 'video';
  if (jobType === 'music') return 'music';
  return 'tts';
}

const SUCCESS_RE = /finish|success|done|complete/i;
const FAIL_RE = /error|fail|reject|cancel/i;

type Kind = 'image' | 'video' | 'unsupported';

function jobKind(jobType: JobType): Kind {
  if (jobType === 'image') return 'image';
  if (jobType === 'video' || jobType === 'avatar-lipsync') return 'video';
  return 'unsupported';
}

function blockUrls(item: FeedItem): string[] {
  const out: string[] = [];
  item.resolutions?.forEach((r) => r.url && out.push(r.url));
  item.images?.forEach((i) => i.url && out.push(i.url));
  item.objects?.forEach((i) => i.url && out.push(i.url));
  if (item.download_url) out.push(item.download_url);
  else if (item.thumbnail_url) out.push(item.thumbnail_url);
  return [...new Set(out)];
}

function blockCounts(item: FeedItem): { ok: number; fail: number } {
  if (item.resolutions && item.resolutions.length) {
    const ok = item.resolutions.filter(
      (r) => Boolean(r.url) || SUCCESS_RE.test(r.status || ''),
    ).length;
    return { ok, fail: item.resolutions.length - ok };
  }
  const hasMedia = blockUrls(item).length > 0;
  const ok = SUCCESS_RE.test(item.status || '') || hasMedia ? 1 : 0;
  const fail = FAIL_RE.test(item.status || '') ? 1 : 0;
  return { ok, fail };
}

function tsToDate(value: string | number | undefined): Date | null {
  if (value == null) return null;
  let ts = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(ts) || ts <= 0) return null;
  if (ts < 1e12) ts *= 1000;
  return new Date(ts);
}

function dayLabel(d: Date): string {
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Hôm nay';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function renderMedia(url: string) {
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) {
    return <video src={url} controls preload="metadata" className="chist-media" />;
  }
  if (/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(url)) {
    return <audio src={url} controls className="chist-audio" />;
  }
  return <img src={url} loading="lazy" alt="" className="chist-media" />;
}

interface KeyedItem {
  key: string;
  item: FeedItem;
}

export default function ComposerHistory({
  jobType,
  zoom,
}: {
  jobType: JobType;
  zoom: number;
}) {
  const kind = jobKind(jobType);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [afterId, setAfterId] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (after: string, reset: boolean) => {
      if (kind === 'unsupported') return;
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError('');
      try {
        const fetcher = kind === 'image' ? fetchMyImages : fetchMyVideos;
        const page = await fetcher({ limit: 30, afterId: after });
        setItems((prev) => (reset ? page.items : [...prev, ...page.items]));
        setAfterId(page.nextAfterId);
        setHasMore(Boolean(page.nextAfterId) && page.items.length > 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setHasMore(false);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [kind],
  );

  useEffect(() => {
    setItems([]);
    setAfterId('');
    setHasMore(true);
    setExpanded(new Set());
    load('', true);
  }, [load]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingRef.current) {
          load(afterId, false);
        }
      },
      { rootMargin: '240px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [afterId, hasMore, load]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      [it.title, it.prompt, it.id_base, it.model]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [items, query]);

  const groups = useMemo(() => {
    const map = new Map<string, KeyedItem[]>();
    filteredItems.forEach((item, i) => {
      const d = tsToDate(item.created_time);
      const label = d ? dayLabel(d) : 'Khác';
      const keyed: KeyedItem = {
        key: `${item.id_base || 'x'}__${item.created_time ?? ''}__${i}`,
        item,
      };
      const bucket = map.get(label);
      if (bucket) bucket.push(keyed);
      else map.set(label, [keyed]);
    });
    return [...map.entries()];
  }, [filteredItems]);

  const toggle = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  if (kind === 'unsupported') {
    return (
      <div className="chist-status">
        Lịch sử Gommo hiện hỗ trợ ảnh và video. Hãy chuyển sang tab Ảnh hoặc Video.
      </div>
    );
  }

  if (error) {
    return (
      <div className="chist-status chist-error">
        <p>Không tải được lịch sử: {error}</p>
        <button type="button" className="composer-ghost-btn" onClick={() => load('', true)}>
          Thử lại
        </button>
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return <div className="chist-status">Chưa có lịch sử tạo.</div>;
  }

  return (
    <div className="chist-wrap">
      <div className="chist-toolbar">
        <div className="chist-search">
          <Search size={15} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm trong lịch sử…"
          />
          {query && (
            <button
              type="button"
              className="chist-search-clear"
              aria-label="Xóa tìm kiếm"
              onClick={() => setQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {groups.length === 0 && (
        <div className="chist-status">
          {query ? 'Không tìm thấy mục nào khớp.' : 'Chưa có lịch sử tạo.'}
        </div>
      )}

      {groups.map(([label, list]) => (
        <section key={label} className="chist-group">
          <header className="chist-group-head">
            <span className="chist-group-label">{label}</span>
            <span className="chist-count">{list.length} mục</span>
          </header>
          <div className="chist-grid">
            {list.map(({ key, item }) => {
              const open = expanded.has(key);
              const { ok, fail } = blockCounts(item);
              const d = tsToDate(item.created_time);
              const name = (item.title || item.prompt || '(Không có mô tả)').trim();
              const urls = open ? blockUrls(item) : [];
              const allUrls = blockUrls(item);
              const blockThumb = item.thumbnail_url || allUrls[0];
              return (
                <Fragment key={key}>
                  <div className="chist-block-cell">
                  <button
                    type="button"
                    className={`chist-block${open ? ' open' : ''}`}
                    onClick={() => toggle(key)}
                  >
                    <div className="chist-block-head">
                      <span className="chist-name" title={name}>
                        {name}
                      </span>
                      <ChevronDown size={15} className={`chist-caret${open ? ' open' : ''}`} />
                    </div>
                    <div className="chist-meta">
                      {d && (
                        <span>
                          <Calendar size={12} />
                          {d.toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                      {d && (
                        <span>
                          <Clock size={12} />
                          {d.toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    <div className="chist-foot">
                      <span className="chist-ok">
                        <Check size={13} />
                        {ok}
                      </span>
                      <span className="chist-fail">
                        <X size={13} />
                        {fail}
                      </span>
                      {item.id_base && <span className="chist-id">ID: {item.id_base}</span>}
                    </div>
                  </button>
                  <div className="chist-block-actions">
                    <ProjectPicker
                      snapshot={{
                        itemId: item.id_base,
                        type: projectType(jobType),
                        prompt: name,
                        thumbnailUrl: blockThumb,
                        downloadUrl: allUrls[0] || blockThumb,
                        createdTime: item.created_time,
                      }}
                    />
                  </div>
                  </div>
                  {open && (
                    <div className="chist-images" style={{ ['--chist-thumb' as string]: `${zoom}px` }}>
                      {urls.length > 0 ? (
                        urls.map((u, i) => (
                          <a
                            key={`${key}-${i}`}
                            href={u}
                            target="_blank"
                            rel="noreferrer"
                            className="chist-img"
                          >
                            {renderMedia(u)}
                          </a>
                        ))
                      ) : (
                        <p className="chist-empty">Không có sản phẩm trong mục này.</p>
                      )}
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        </section>
      ))}

      {loading && <div className="chist-status">Đang tải…</div>}
      <div ref={sentinelRef} className="chist-sentinel" />
    </div>
  );
}
