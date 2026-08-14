import { useMemo, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useLocale } from '../../i18n';
import { getProductTabs } from '../../lib/landingI18n';

const TAB_SPRING = { type: 'spring' as const, stiffness: 420, damping: 36 };
const DEFAULT_TAB_ID = 'chat';

export default function ProductTabsSection() {
  const { t } = useLocale();
  const productTabs = useMemo(() => getProductTabs(t), [t]);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [activeId, setActiveId] = useState(DEFAULT_TAB_ID);

  const active = useMemo(
    () => productTabs.find((tab) => tab.id === activeId) ?? productTabs[0]!,
    [activeId, productTabs],
  );

  return (
    <section
      id="product"
      className="landing-section landing-section-light product-tabs-section"
      ref={ref}
    >
      <div className="container product-tabs-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <div className="landing-section-head product-tabs-head">
            <h2>{t('landing.product.title')}</h2>
            <p>{t('landing.product.subtitle')}</p>
          </div>

          <div className="product-tabs-bar">
            <div className="product-tabs-track" role="tablist">
              {productTabs.map((tab) => {
                const isActive = activeId === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`product-tab${isActive ? ' active' : ''}`}
                    onClick={() => setActiveId(tab.id)}
                  >
                    {isActive ? (
                      <motion.span
                        layoutId="product-tab-indicator"
                        className="product-tab-indicator"
                        transition={TAB_SPRING}
                      />
                    ) : null}
                    <span className="product-tab-label">{tab.label}</span>
                    {tab.badge ? <span className="product-tab-badge">{tab.badge}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="product-tabs-block">
            <div className="product-tabs-panel">
              <div className="product-tabs-copy">
                <span className="product-tabs-kicker">{active.kicker}</span>
                <h3>{active.headline}</h3>
                <p>{active.lead}</p>
                <div className="product-mini-grid">
                  {active.features.map((f) => (
                    <article key={f.title} className="product-mini-card">
                      <h4>{f.title}</h4>
                      <p>{f.desc}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="product-tabs-mock" aria-hidden="true">
                <div className="product-mock-chrome">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="product-mock-sidebar">
                  {productTabs.map((tab) => (
                    <div key={tab.id} className={`product-mock-nav${tab.id === activeId ? ' on' : ''}`}>
                      <tab.icon size={14} />
                      {tab.label}
                    </div>
                  ))}
                </div>
                <div className="product-mock-main">
                  <div className="product-mock-toolbar">{active.mockLabel}</div>
                  <div className="product-mock-grid">
                    {active.features.slice(0, 3).map((f) => (
                      <div key={f.title} className="product-mock-tile">
                        <strong>{f.title}</strong>
                        <span>{f.desc.slice(0, 48)}…</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
