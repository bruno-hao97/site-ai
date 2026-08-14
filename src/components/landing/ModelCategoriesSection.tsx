import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useMemo, useRef } from 'react';
import { useModelCatalog } from '../../hooks/useModelCatalog';
import { catalogByJobTypes } from '../../services/modelCatalog';
import type { JobType } from '../../services/api';
import { useLocale } from '../../i18n';
import { getCategoryItems } from '../../lib/landingI18n';
import { CHAT_AI_MODELS } from '../../services/chatAiModels';

export default function ModelCategoriesSection() {
  const { t } = useLocale();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const { available, loading, count } = useModelCatalog();

  const categories = useMemo(() => {
    return getCategoryItems(t).map((cat) => {
      let modelCount = 0;
      if (cat.id === 'chat') {
        modelCount = CHAT_AI_MODELS.filter((m) => m.selectable).length;
      } else if (cat.id === 'workflow') {
        modelCount = 0;
      } else if (cat.types.length) {
        modelCount = catalogByJobTypes(available, [...cat.types] as JobType[]).length;
      }
      const href =
        cat.id === 'workflow' ? '/workflow' : cat.id === 'chat' ? '/chat' : `/models`;
      return { ...cat, modelCount, href };
    });
  }, [available, t]);

  const subtitle = loading
    ? t('landing.categories.loading')
    : t('landing.categories.subtitleWithCount', { count: count || 50 });

  return (
    <section id="categories" className="landing-section landing-section-light model-categories-section" ref={ref}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <div className="landing-section-head">
            <h2>{t('landing.categories.title')}</h2>
            <p>{subtitle}</p>
          </div>

          <div className="model-categories-row">
            {categories.map((cat) => (
              <Link key={cat.id} to={cat.href} className="model-category-pill">
                <span className="model-category-icon">
                  <cat.icon size={22} />
                </span>
                <span className="model-category-label">{cat.label}</span>
                {cat.modelCount > 0 ? (
                  <span className="model-category-count">
                    {t('landing.categories.modelCount', { count: cat.modelCount })}
                  </span>
                ) : cat.id === 'workflow' ? (
                  <span className="model-category-count">{t('landing.categories.workflowBadge')}</span>
                ) : null}
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
