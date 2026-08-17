import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { Heart, MessageCircle, Play, UserPlus } from 'lucide-react';
import { useLocale } from '../i18n';
import {
  feedMediaUrl,
  feedPosterUrl,
  feedPreviewVideoUrl,
  feedThumb,
  type FeedItem,
} from '../services/feedApi';
import { isFavorite, toggleFavorite } from '../services/feedFavoritesStore';

function isVideoItem(item: FeedItem): boolean {
  const t = (item.type || '').toLowerCase();
  if (t === 'image' || t === 'image-upscale' || t === 'remove-bg') return false;
  if (t === 'video' || t === 'avatar-lipsync') return true;
  const media = feedMediaUrl(item) || '';
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(media);
}

let activePreviewVideo: HTMLVideoElement | null = null;

function pauseOtherPreviews(except?: HTMLVideoElement) {
  if (activePreviewVideo && activePreviewVideo !== except) {
    activePreviewVideo.pause();
    activePreviewVideo.currentTime = 0;
    activePreviewVideo = null;
  }
}

export default function FeedMasonryCard({
  item,
  onOpen,
  onFavoriteChange,
}: {
  item: FeedItem;
  onOpen?: () => void;
  onFavoriteChange?: () => void;
}) {
  const { t } = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fav, setFav] = useState(() => isFavorite(item.id_base));
  const [hovering, setHovering] = useState(false);
  const [canHoverPreview, setCanHoverPreview] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<string | null>(null);

  const poster = feedPosterUrl(item);
  const previewUrl = feedPreviewVideoUrl(item);
  const fallbackThumb = feedThumb(item);
  const media = feedMediaUrl(item);
  const video = isVideoItem(item);
  const imageSrc = poster || (!video ? fallbackThumb : null);
  const showVideo = video && Boolean(previewUrl);
  const showImage = !showVideo && Boolean(imageSrc);
  const author = item.author?.name || t('home.feed.anonymous');
  const likes = item.likes_count ?? item.like_count ?? 0;
  const comments = item.comments_count ?? 0;
  const openable = Boolean(onOpen && (media || poster || previewUrl || fallbackThumb));

  useEffect(() => {
    const sync = () => setFav(isFavorite(item.id_base));
    document.addEventListener('favorites:updated', sync);
    return () => document.removeEventListener('favorites:updated', sync);
  }, [item.id_base]);

  useEffect(() => {
    if (!poster) {
      setAspectRatio(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled || !img.naturalWidth || !img.naturalHeight) return;
      setAspectRatio(`${img.naturalWidth} / ${img.naturalHeight}`);
    };
    img.src = poster;
    return () => {
      cancelled = true;
    };
  }, [poster]);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanHoverPreview(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(
    () => () => {
      if (videoRef.current && activePreviewVideo === videoRef.current) {
        activePreviewVideo = null;
      }
    },
    [],
  );

  const stopPreview = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    if (activePreviewVideo === el) activePreviewVideo = null;
  }, []);

  const startPreview = useCallback(() => {
    if (!canHoverPreview || !previewUrl) return;
    const el = videoRef.current;
    if (!el) return;
    pauseOtherPreviews(el);
    activePreviewVideo = el;
    void el.play().catch(() => {});
  }, [canHoverPreview, previewUrl]);

  const onMediaEnter = () => {
    setHovering(true);
    startPreview();
  };

  const onMediaLeave = () => {
    setHovering(false);
    stopPreview();
  };

  const onHeart = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = toggleFavorite(item.id_base, item);
    setFav(next);
    onFavoriteChange?.();
  };

  const previewing = hovering && showVideo && canHoverPreview;

  return (
    <article className={`feed-masonry-card${previewing ? ' is-previewing' : ''}`}>
      <div
        className={`feed-masonry-media${openable ? ' feed-masonry-media-openable' : ''}${showVideo && !poster ? ' feed-masonry-media--video-only' : ''}`}
        role={openable ? 'button' : undefined}
        tabIndex={openable ? 0 : undefined}
        onClick={() => {
          if (openable) onOpen?.();
        }}
        onKeyDown={(e) => {
          if (openable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onOpen?.();
          }
        }}
        onMouseEnter={onMediaEnter}
        onMouseLeave={onMediaLeave}
      >
        {!showVideo && !showImage ? (
          <span className="feed-masonry-empty">{t('home.feed.processing')}</span>
        ) : null}

        {showImage ? (
          <img className="feed-masonry-media-el" src={imageSrc!} alt="" loading="lazy" />
        ) : null}

        {showVideo ? (
          <div
            className={`feed-masonry-frame${poster ? ' feed-masonry-frame--sized' : ''}`}
            style={
              aspectRatio
                ? ({ ['--feed-aspect' as string]: aspectRatio } as CSSProperties)
                : undefined
            }
          >
            {poster && !previewing ? (
              <img
                className="feed-masonry-media-el feed-masonry-poster"
                src={poster}
                alt=""
                loading="lazy"
              />
            ) : null}
            <video
              ref={videoRef}
              className="feed-masonry-media-el feed-masonry-video"
              src={previewUrl!}
              muted
              loop
              playsInline
              preload="metadata"
            />
          </div>
        ) : null}

        {video && (
          <span className="feed-masonry-play">
            <Play size={18} fill="currentColor" />
          </span>
        )}

        <span className="feed-masonry-type">{video ? 'VIDEO' : 'IMAGE'}</span>

        {item.duration && Number(item.duration) > 0 && (
          <span className="feed-masonry-duration">{item.duration}s</span>
        )}

        <div className="feed-masonry-overlay">
          <div className="feed-masonry-user">
            {item.author?.avatar ? (
              <img className="feed-masonry-avatar" src={item.author.avatar} alt="" loading="lazy" />
            ) : (
              <span className="feed-masonry-avatar feed-masonry-avatar-empty" />
            )}
            <span className="feed-masonry-name">{author}</span>
            <span className="feed-masonry-follow">
              <UserPlus size={12} /> Follow
            </span>
          </div>
        </div>
      </div>

      <div className="feed-masonry-actions">
        <button
          type="button"
          className={`feed-masonry-icon${fav ? ' fav-on' : ''}`}
          aria-label={fav ? 'Bỏ yêu thích' : 'Yêu thích'}
          onClick={onHeart}
        >
          <Heart size={15} fill={fav ? 'currentColor' : 'none'} />
          <span>{fav ? Math.max(likes, 1) : likes}</span>
        </button>
        <button type="button" className="feed-masonry-icon" aria-label="Bình luận">
          <MessageCircle size={15} />
          <span>{comments}</span>
        </button>
      </div>
    </article>
  );
}
