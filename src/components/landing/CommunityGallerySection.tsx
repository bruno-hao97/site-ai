import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useRef } from 'react';
import { useLandingFeedPreview } from '../../hooks/useLandingFeedPreview';
import { useLocale } from '../../i18n';
import { feedThumb } from '../../services/feedApi';
import { SITE_DISPLAY_NAME } from '../../services/siteConfig';

const PLACEHOLDER_COUNT = 11;

/** Magnific-style masonry: portrait / wide / square mix */
const GALLERY_LAYOUTS = [
  'portrait',
  'portrait',
  'wide',
  '',
  '',
  '',
  '',
  'wide',
  '',
  '',
  '',
] as const;

function galleryCellClass(index: number): string {
  const layout = GALLERY_LAYOUTS[index] ?? '';
  return `community-gallery-cell${layout ? ` ${layout}` : ''}`;
}

export default function CommunityGallerySection() {
  const { t } = useLocale();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const { items, loading } = useLandingFeedPreview(12);
  const galleryItems = items.slice(0, 11);

  return (
    <section id="community" className="landing-section landing-section-light community-gallery-section" ref={ref}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <div className="landing-section-head landing-section-head-row">
            <div>
              <h2>{t('landing.community.title')}</h2>
              <p>{t('landing.community.subtitle', { siteName: SITE_DISPLAY_NAME })}</p>
            </div>
            <a href="#community" className="landing-link-btn">
              {t('landing.community.viewMore')}
              <ArrowRight size={14} />
            </a>
          </div>

          <div className="community-gallery-grid">
            <Link to="/image" className="community-featured-card">
              <Sparkles size={22} />
              <h3>{t('landing.community.featured.title')}</h3>
              <p>{t('landing.community.featured.desc')}</p>
              <span className="community-featured-cta">{t('landing.community.featured.cta')}</span>
            </Link>

            {loading
              ? Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
                  <div key={`ph-${i}`} className={`${galleryCellClass(i)} skeleton`} />
                ))
              : null}

            {!loading && galleryItems.length === 0
              ? Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
                  <div key={`empty-${i}`} className={`${galleryCellClass(i)} placeholder`}>
                    <span>{t('landing.community.updating')}</span>
                  </div>
                ))
              : null}

            {!loading
              ? galleryItems.map((item, index) => {
                  const thumb = feedThumb(item);
                  const isImage = item.type === 'image';
                  return (
                    <div
                      key={item.id_base}
                      className={galleryCellClass(index)}
                      style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
                      role="img"
                      aria-label={
                        isImage ? t('landing.community.imageAlt') : t('landing.community.videoAlt')
                      }
                    >
                      {!thumb ? (
                        <span>{isImage ? t('landing.community.image') : t('landing.community.video')}</span>
                      ) : null}
                    </div>
                  );
                })
              : null}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
