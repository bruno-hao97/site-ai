import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { studioRouteForType } from '../../constants/studioTypes';
import { useModelCatalog } from '../../hooks/useModelCatalog';
import {
  buildNewModelChecker,
  modelLabel,
  modelOnSale,
  modelPriceLabel,
} from '../../services/modelCatalogDisplay';
import { modelSlug } from '../../services/modelSchema';
import { useLandingCta } from './LandingLayout';

export default function ModelsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const { available, loading, error } = useModelCatalog();
  const cta = useLandingCta();

  const highlights = useMemo(() => {
    const isNew = buildNewModelChecker(available.map((e) => e.model));
    const sorted = [...available].sort((a, b) => {
      const aScore = (isNew(a.model) ? 2 : 0) + (modelOnSale(a.model) ? 1 : 0);
      const bScore = (isNew(b.model) ? 2 : 0) + (modelOnSale(b.model) ? 1 : 0);
      return bScore - aScore || (b.model.created_time ?? 0) - (a.model.created_time ?? 0);
    });
    return sorted.slice(0, 4);
  }, [available]);

  return (
    <section id="models" className="models-section" ref={ref}>
      <div className="container">
        <div className="models-header">
          <div>
            <h2>Các Model Phổ Biến</h2>
            <p className="models-header-sub">Khám phá các model AI được sử dụng nhiều nhất</p>
          </div>
          <Link to="/models" className="view-all-link">
            Xem tất cả Model <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="model-dir-loading">
            <Loader2 size={18} className="spin" />
            <span>Đang tải model…</span>
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
                    <span className="model-badge badge-new">MỚI NHẤT</span>
                  ) : modelOnSale(entry.model) ? (
                    <span className="model-badge badge-trending">SALE</span>
                  ) : null}
                  <span className="model-icon">✦</span>
                  <h3 className="model-name">{name}</h3>
                  <p className="model-desc">
                    {entry.model.description?.trim() || `Model ${entry.jobType}`}
                  </p>
                  {price ? <p className="model-price-preview">{price} credits</p> : null}
                  <button
                    type="button"
                    className="model-btn"
                    onClick={() => cta(`${route}?model=${encodeURIComponent(slug)}`)}
                  >
                    Thử ngay
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
