import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { useLandingFeedPreview } from '../../hooks/useLandingFeedPreview';
import { feedThumb, type FeedItem } from '../../services/feedApi';
import { useLocale } from '../../i18n';

function isVideoItem(item: FeedItem): boolean {
  const t = (item.type || '').toLowerCase();
  return t === 'video' || t === 'avatar-lipsync';
}

export default function HomeWhatsNewStrip() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { items, loading } = useLandingFeedPreview(8);
  const cards = items.filter((it) => feedThumb(it)).slice(0, 8);

  if (!loading && cards.length === 0) return null;

  return (
    <section className="home-whats-new" aria-label={t('home.section.whatsNew')}>
      <h2 className="home-section-title">{t('home.section.whatsNew')}</h2>
      <div className="home-whats-new-track">
        {loading &&
          Array.from({ length: 4 }, (_, i) => (
            <div key={`sk-${i}`} className="home-whats-new-card home-whats-new-card--skeleton" />
          ))}
        {!loading &&
          cards.map((item) => {
            const thumb = feedThumb(item)!;
            const video = isVideoItem(item);
            return (
              <button
                key={item.id_base}
                type="button"
                className="home-whats-new-card"
                onClick={() => navigate(video ? '/video' : '/image')}
              >
                <img src={thumb} alt="" loading="lazy" />
                <span className="home-whats-new-overlay">
                  {video && (
                    <span className="home-whats-new-play">
                      <Play size={16} fill="currentColor" />
                    </span>
                  )}
                  <span className="home-whats-new-label">
                    {item.title || item.prompt?.slice(0, 48) || (video ? 'Video' : 'Image')}
                  </span>
                </span>
              </button>
            );
          })}
      </div>
    </section>
  );
}
