import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Plug, Shield, Zap } from 'lucide-react';
import { useLocale } from '../../i18n';

export default function FeaturesSection() {
  const { t } = useLocale();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="features" className="features-section">
      <div className="container">
        <div className="features-heading">
          <h2>
            {t('landing.features.titleLine1')}
            <br />
            <span>{t('landing.features.titleLine2')}</span>
          </h2>
        </div>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="features-grid"
        >
          <div className="feature-card">
            <div className="feature-icon icon-purple">
              <Plug size={20} />
            </div>
            <h3>{t('landing.features.api.title')}</h3>
            <p>{t('landing.features.api.desc')}</p>
            <div className="code-block">
              <div className="code-dots">
                <span className="dot-r" />
                <span className="dot-y" />
                <span className="dot-g" />
              </div>
              <div>
                <span className="code-keyword">const</span>{' '}
                <span className="code-var">response</span> ={' '}
                <span className="code-keyword">await</span> ai.
                <span className="code-fn">generate</span>
                {'({'}
              </div>
              <div>
                &nbsp;&nbsp;<span className="code-var">model</span>:{' '}
                <span className="code-string">&quot;gemini-2.5-pro&quot;</span>,
              </div>
              <div>
                &nbsp;&nbsp;<span className="code-var">prompt</span>:{' '}
                <span className="code-string">&quot;...&quot;</span>
              </div>
              <div>{'}'});</div>
              <div className="code-comment">{'// returns: { content, usage, cost }'}</div>
            </div>
          </div>

          <div className="features-right">
            <div className="feature-card">
              <div className="feature-icon icon-blue">
                <Zap size={20} />
              </div>
              <h3>{t('landing.features.latency.title')}</h3>
              <p>{t('landing.features.latency.desc')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon icon-green">
                <Shield size={20} />
              </div>
              <h3>{t('landing.features.security.title')}</h3>
              <p>{t('landing.features.security.desc')}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
