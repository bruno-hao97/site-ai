import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { useLocale } from '../../i18n';
import { registerPathWithNext } from '../../lib/landingConfig';
import { getEnterpriseFeatures } from '../../lib/landingEnterpriseFeatures';

export default function EnterpriseFeaturesSection() {
  const { t } = useLocale();
  const features = useMemo(() => getEnterpriseFeatures(t), [t]);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      id="creator"
      className="landing-section landing-section-dark enterprise-features-section"
      ref={ref}
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <div className="enterprise-features-head">
            <h2>{t('landing.enterprise.title')}</h2>
            <p>{t('landing.enterprise.subtitle')}</p>
          </div>

          <div className="enterprise-features-grid">
            {features.map((feature) => (
              <article key={feature.title} className="enterprise-feature-card">
                <span className="enterprise-feature-icon">
                  <feature.icon size={20} strokeWidth={2} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </article>
            ))}
          </div>

          <div className="enterprise-features-cta">
            <Link to={registerPathWithNext('/home')} className="btn-primary">
              {t('landing.enterprise.ctaPrimary')}
              <ArrowRight size={16} />
            </Link>
            <Link to="/workflow" className="btn-secondary">
              {t('landing.enterprise.ctaWorkflow')}
            </Link>
            <Link to="/pricing" className="enterprise-features-link">
              {t('landing.enterprise.ctaPricing')}
              <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
