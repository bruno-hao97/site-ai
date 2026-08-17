import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { studioRouteForType } from '../../constants/studioTypes';
import { useModelCatalog } from '../../hooks/useModelCatalog';
import { useLocale } from '../../i18n';
import {
  buildNewModelChecker,
  modelCreatedUnix,
  modelLabel,
  modelOnSale,
  modelPriceLabel,
} from '../../services/modelCatalogDisplay';
import { modelSlug } from '../../services/modelSchema';
import { useLandingCta } from './LandingLayout';

export default function ModelsSection() {
  const { t } = useLocale();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const { available, loading, error } = useModelCatalog();
  const cta = useLandingCta();

  const highlights = useMemo(() => {
    const isNew = buildNewModelChecker(available.map((e) => e.model));
    const sorted = [...available].sort((a, b) => {
      const aScore = (isNew(a.model) ? 2 : 0) + (modelOnSale(a.model) ? 1 : 0);
      const bScore = (isNew(b.model) ? 2 : 0) + (modelOnSale(b.model) ? 1 : 0);
      return (
        bScore - aScore ||
        (modelCreatedUnix(b.model) ?? 0) - (modelCreatedUnix(a.model) ?? 0)
      );
    });
    return sorted.slice(0, 4);
  }, [available]);

  return (
    <section id="models" className="models-section" ref={ref}>
      <div className="container">
        <div className="models-header">
          <div>
            <h2>{t('landing.models.title')}</h2>
            <p className="models-header-sub">{t('landing.models.subtitle')}</p>
          </div>
          <Link to="/models" className="view-all-link">
            {t('landing.models.viewAll')} <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="model-dir-loading">
            <Loader2 size={18} className="spin" />
            <span>{t('landing.models.loading')}</span>
          </div>
        ) : null}

        {!loading && error ? <p className="model-dir-error">{error}</p> : null}

        {!loading && !error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="models-grid"
          >
            {highlights.map((entry) => {
              const name = modelLabel(entry.model);
              const price = modelPriceLabel(entry.model);
              const checkNew = buildNewModelChecker(available.map((e) => e.model));
              const isNew = checkNew(entry.model);
              const route = studioRouteForType(entry.jobType);
              const slug = modelSlug(entry.model);
              return (
                <article key={`${entry.jobType}-${slug}`} className="model-card">
                  {isNew ? (
                    <span className="model-badge badge-new">{t('landing.models.badge.new')}</span>
                  ) : modelOnSale(entry.model) ? (
                    <span className="model-badge badge-trending">{t('landing.models.badge.sale')}</span>
                  ) : null}
                  <span className="model-icon">✦</span>
                  <h3 className="model-name">{name}</h3>
                  <p className="model-desc">
                    {entry.model.description?.trim() ||
                      t('landing.models.fallbackDesc', { jobType: entry.jobType })}
                  </p>
                  {price ? (
                    <p className="model-price-preview">
                      {price}
                      {t('landing.models.creditsSuffix')}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="model-btn"
                    onClick={() => cta(`${route}?model=${encodeURIComponent(slug)}`)}
                  >
                    {t('landing.models.tryNow')}
                  </button>
                </article>
              );
            })}
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
