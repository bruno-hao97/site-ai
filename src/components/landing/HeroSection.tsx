import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import HeroCapabilityTicker from './HeroCapabilityTicker';
import { useLocale } from '../../i18n';
import { registerPathWithNext } from '../../lib/landingConfig';
import { SITE_DISPLAY_NAME } from '../../services/siteConfig';

const HERO_IMAGE_BASE =
  'https://media.magnific.com/images/ai/photo-editor/v3/hero/magnific/ai-photo-editor-v3-image-header-desktop.webp';

const HERO_IMAGES = {
  sm: `${HERO_IMAGE_BASE}?w=640&h=1200&q=75`,
  md: `${HERO_IMAGE_BASE}?w=1280&h=2400&q=75`,
  lg: `${HERO_IMAGE_BASE}?w=1974&h=3700&q=75`,
} as const;

export default function HeroSection() {
  const { t } = useLocale();

  return (
    <section className="hero hero-magnific">
      <div className="hero-magnific-backdrop" aria-hidden="true">
        <picture>
          <source media="(min-width: 1280px)" srcSet={HERO_IMAGES.lg} />
          <source media="(min-width: 768px)" srcSet={HERO_IMAGES.md} />
          <img
            className="hero-magnific-photo"
            src={HERO_IMAGES.sm}
            srcSet={`${HERO_IMAGES.sm} 640w, ${HERO_IMAGES.md} 1280w, ${HERO_IMAGES.lg} 1974w`}
            sizes="100vw"
            alt=""
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <div className="hero-magnific-gradient" />
      </div>

      <div className="hero-magnific-inner">
        <div className="hero-magnific-main">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {t('landing.hero.titleLine1')}
            <br />
            {t('landing.hero.titleLine2')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="hero-subtitle hero-magnific-subtitle"
          >
            {t('landing.hero.subtitle', { siteName: SITE_DISPLAY_NAME })}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hero-buttons hero-magnific-buttons"
          >
            <Link to={registerPathWithNext('/home')} className="btn-hero-primary">
              {t('landing.hero.ctaPrimary')}
              <ArrowUpRight size={16} strokeWidth={2.25} />
            </Link>
            <a href="#product" className="btn-hero-secondary">
              {t('landing.hero.ctaSecondary')}
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="hero-capability-wrap"
        >
          <HeroCapabilityTicker />
        </motion.div>
      </div>
    </section>
  );
}
