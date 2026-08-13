import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useLandingFeedPreview } from '../../hooks/useLandingFeedPreview';
import { feedMediaUrl, feedThumb, type FeedItem } from '../../services/feedApi';

function isVideoMediaUrl(url: string): boolean {
  const base = url.split('?')[0].split('#')[0].toLowerCase();
  return /\.(mp4|webm|mov|m4v|m3u8|avi)(\?|$)/i.test(base) || base.includes('/video/');
}

function feedPreviewVideoUrl(item: FeedItem): string | null {
  const preview = item.url_preview?.trim();
  if (preview && isVideoMediaUrl(preview)) return preview;
  const media = feedMediaUrl(item);
  if (media && isVideoMediaUrl(media)) return media;
  return null;
}

function ShowcaseCell({ item, wide }: { item: FeedItem; wide?: boolean }) {
  const cellRef = useRef<HTMLAnchorElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrl = feedPreviewVideoUrl(item);
  const poster = feedThumb(item) ?? undefined;

  useEffect(() => {
    const cell = cellRef.current;
    const video = videoRef.current;
    if (!cell || !video || !videoUrl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(cell);
    return () => observer.disconnect();
  }, [videoUrl]);

  return (
    <Link
      ref={cellRef}
      to="/explore"
      className={`video-showcase-cell${wide ? ' wide' : ''}`}
    >
      {videoUrl ? (
        <video
          ref={videoRef}
          className="video-showcase-media"
          src={videoUrl}
          poster={poster}
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : poster ? (
        <img className="video-showcase-media" src={poster} alt="" loading="lazy" />
      ) : null}
    </Link>
  );
}

export default function VideoShowcaseSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const { items, loading } = useLandingFeedPreview(20);

  const videos = useMemo(() => {
    const candidates = items.filter((it) => {
      const t = (it.type || '').toLowerCase();
      return t !== 'image' && t !== 'image-upscale' && t !== 'remove-bg';
    });
    const withVideo = candidates.filter((it) => feedPreviewVideoUrl(it));
    const withThumb = candidates.filter((it) => !feedPreviewVideoUrl(it) && feedThumb(it));
    return [...withVideo, ...withThumb].slice(0, 4);
  }, [items]);

  return (
    <section className="landing-section landing-section-light video-showcase-section" ref={ref}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <div className="landing-section-head landing-section-head-row">
            <div>
              <h2>Bắt đầu từ ý tưởng — xuất video trong vài phút</h2>
              <p>Text-to-video, image-to-video và avatar lipsync trong một studio.</p>
            </div>
            <Link to="/explore" className="landing-link-btn">
              Khám phá video
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="video-showcase-grid">
            {loading
              ? Array.from({ length: 4 }, (_, i) => (
                  <div
                    key={`sk-${i}`}
                    className={`video-showcase-cell${i === 3 ? ' wide' : ''} skeleton`}
                  />
                ))
              : null}

            {!loading && videos.length === 0
              ? Array.from({ length: 4 }, (_, i) => (
                  <div
                    key={`ph-${i}`}
                    className={`video-showcase-cell${i === 3 ? ' wide' : ''} placeholder`}
                  >
                    <Play size={28} />
                    <span>Video mẫu sắp có</span>
                  </div>
                ))
              : null}

            {!loading
              ? videos.map((item, i) => (
                  <ShowcaseCell key={item.id_base} item={item} wide={i === 3} />
                ))
              : null}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
