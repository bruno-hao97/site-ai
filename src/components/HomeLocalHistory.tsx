import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, Volume2, Wand2 } from 'lucide-react';
import {
  isMediaUrl,
  listHistory,
  loadFavorites,
  type HistoryEntry,
  type HistoryType,
} from '../services/historyStore';
import { navigateReuseHistoryEntry } from '../utils/feedItemReuse';
import { studioRouteForType } from '../constants/studioTypes';
import type { JobType } from '../services/api';

export type LocalHistoryFilter = 'music' | 'tts' | 'favorites';

function emptyCopy(filter: LocalHistoryFilter): { title: string; hint: string; ctaTo: string; cta: string } {
  switch (filter) {
    case 'music':
      return {
        title: 'Chưa có nhạc trong lịch sử',
        hint: 'Tạo nhạc AI trong Studio — kết quả sẽ hiện tại đây.',
        ctaTo: '/music',
        cta: 'Tạo nhạc',
      };
    case 'tts':
      return {
        title: 'Chưa có âm thanh trong lịch sử',
        hint: 'Tạo giọng đọc AI trong Studio — kết quả sẽ hiện tại đây.',
        ctaTo: '/audio',
        cta: 'Tạo giọng đọc',
      };
    default:
      return {
        title: 'Chưa có mục yêu thích',
        hint: 'Đánh dấu yêu thích trong lịch sử Studio để xem lại nhanh tại đây.',
        ctaTo: '/studio-history',
        cta: 'Xem lịch sử',
      };
  }
}

export default function HomeLocalHistory({ filter }: { filter: LocalHistoryFilter }) {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onUpd = () => setTick((n) => n + 1);
    document.addEventListener('history:updated', onUpd);
    return () => document.removeEventListener('history:updated', onUpd);
  }, []);

  const entries = useMemo(() => {
    void tick;
    if (filter === 'favorites') {
      const favs = loadFavorites();
      return listHistory(null).filter((e) => favs.has(e.id));
    }
    return listHistory(filter as HistoryType);
  }, [filter, tick]);

  const copy = emptyCopy(filter);

  if (!entries.length) {
    return (
      <div className="home-local-empty">
        <p className="home-local-empty-title">{copy.title}</p>
        <p className="muted">{copy.hint}</p>
        <Link to={copy.ctaTo} className="btn primary">
          {copy.cta}
        </Link>
      </div>
    );
  }

  return (
    <div className="home-feed">
      <div className="home-masonry">
        {entries.map((entry) => (
          <LocalCard
            key={entry.id}
            entry={entry}
            onReuse={() => navigateReuseHistoryEntry(navigate, entry)}
          />
        ))}
      </div>
    </div>
  );
}

function LocalCard({ entry, onReuse }: { entry: HistoryEntry; onReuse: () => void }) {
  const kind = isMediaUrl(entry.resultUrl, entry.type);
  const Icon = entry.type === 'music' ? Music : Volume2;

  return (
    <article className="feed-card home-local-card">
      <div className="feed-media home-local-media">
        {kind === 'image' ? (
          <img src={entry.resultUrl} alt="" loading="lazy" />
        ) : kind === 'video' ? (
          <video src={entry.resultUrl} muted playsInline preload="metadata" />
        ) : (
          <div className="home-local-audio">
            <Icon size={28} />
            <audio src={entry.resultUrl} controls preload="metadata" />
          </div>
        )}
      </div>
      <div className="feed-card-meta">
        <span className="feed-time">
          {new Date(entry.createdAt).toLocaleDateString('vi-VN')}
        </span>
        {entry.modelName && <span className="feed-model">{entry.modelName}</span>}
      </div>
      {entry.prompt && <p className="home-local-prompt">{entry.prompt}</p>}
      <footer className="feed-card-foot">
        <Link
          to={studioRouteForType(entry.type as JobType)}
          className="muted"
          style={{ fontSize: '0.75rem' }}
        >
          Studio
        </Link>
        <button type="button" className="feed-remix" onClick={onReuse}>
          <Wand2 size={13} /> Remix
        </button>
      </footer>
    </article>
  );
}
