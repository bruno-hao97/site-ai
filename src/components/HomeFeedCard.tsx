import { Heart, MessageCircle, Play, Share2, Sparkles, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  feedMediaUrl,
  feedModelLabel,
  feedSourceCount,
  feedThumb,
  formatFeedTime,
  type FeedItem,
} from '../services/feedApi';
import { feedItemJobType, navigateReuseFeedItem } from '../utils/feedItemReuse';
import ProjectPicker from './ProjectPicker';

export default function HomeFeedCard({
  item,
  onOpenPreview,
  showProjectPicker = false,
  showModelBadge = false,
  authorFallback = 'Ẩn danh',
}: {
  item: FeedItem;
  onOpenPreview: (item: FeedItem) => void;
  showProjectPicker?: boolean;
  showModelBadge?: boolean;
  authorFallback?: string;
}) {
  const navigate = useNavigate();
  const thumb = feedThumb(item);
  const media = feedMediaUrl(item);
  const jobType = feedItemJobType(item);
  const isVideo = jobType === 'video' || jobType === 'avatar-lipsync';
  const sources = feedSourceCount(item);
  const model = feedModelLabel(item);

  const remix = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigateReuseFeedItem(navigate, item, {
      withMediaAsReference: jobType === 'image',
    });
  };

  return (
    <article className="feed-card">
      {showProjectPicker && (
        <div className="feed-card-actions">
          <ProjectPicker
            snapshot={{
              itemId: item.id_base,
              type: item.type,
              prompt: item.prompt || item.title,
              thumbnailUrl: thumb || undefined,
              downloadUrl: media || undefined,
              createdTime: item.created_time,
            }}
          />
        </div>
      )}

      <header className="feed-card-head">
        {item.author?.avatar ? (
          <img className="feed-avatar" src={item.author.avatar} alt="" loading="lazy" />
        ) : (
          <span className="feed-avatar feed-avatar-empty" />
        )}
        <span className="feed-author">{item.author?.name || authorFallback}</span>
        {item.resolution && item.resolution !== 'unknow' && (
          <span className="feed-res">{item.resolution}</span>
        )}
      </header>

      <button
        type="button"
        className="feed-media"
        onClick={() => onOpenPreview(item)}
        aria-label="Xem trước"
      >
        {thumb ? (
          <img src={thumb} alt="" loading="lazy" />
        ) : (
          <span className="feed-media-empty">Đang xử lý…</span>
        )}
        {isVideo && (
          <span className="feed-play">
            <Play size={20} fill="currentColor" />
          </span>
        )}
        {showModelBadge && model && <span className="feed-model-badge">{model}</span>}
        {sources > 1 && <span className="feed-count">{sources}</span>}
        {item.duration && Number(item.duration) > 0 && (
          <span className="feed-duration">{item.duration}s</span>
        )}
      </button>

      <div className="feed-card-meta">
        {!showModelBadge && item.model && (
          <span className="feed-model">
            <Sparkles size={11} /> {item.model}
          </span>
        )}
        <span className="feed-time">{formatFeedTime(item.created_time)}</span>
      </div>

      <footer className="feed-card-foot">
        <div className="feed-stats">
          <span>
            <Heart size={14} /> {item.likes_count ?? item.like_count ?? 0}
          </span>
          <span>
            <MessageCircle size={14} /> {item.comments_count ?? 0}
          </span>
          <span>
            <Share2 size={14} />
          </span>
        </div>
        <button type="button" className="feed-remix" onClick={remix}>
          <Wand2 size={13} /> {isVideo ? 'Edit video' : 'Remix'}
        </button>
      </footer>
    </article>
  );
}
