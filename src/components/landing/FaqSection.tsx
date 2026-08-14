import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { getFaqItems } from '../../lib/faqContent';
import { HOME_NOTIF_CONTACT } from '../../services/siteConfig';
import { useLocale } from '../../i18n';

export default function FaqSection() {
  const { t } = useLocale();
  const faqItems = getFaqItems(t);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [openIdx, setOpenIdx] = useState(-1);

  return (
    <section id="faq" className="landing-section landing-section-light faq-section" ref={ref}>
      <div className="container">
        <motion.div
          className="landing-faq-layout"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <div className="landing-faq-intro">
            <h2>{t('pricing.faq.title')}</h2>
            <a
              href={HOME_NOTIF_CONTACT.zaloSupport}
              target="_blank"
              rel="noreferrer"
              className="landing-faq-support-btn"
            >
              {t('pricing.faq.support')}
            </a>
          </div>

          <div className="landing-faq-list">
            {faqItems.map((item, idx) => {
              const opened = openIdx === idx;
              return (
                <div key={item.q} className={`landing-faq-item${opened ? ' open' : ''}`}>
                  <button
                    type="button"
                    className="landing-faq-trigger"
                    onClick={() => setOpenIdx(opened ? -1 : idx)}
                    aria-expanded={opened}
                  >
                    <span className="landing-faq-q">{item.q}</span>
                    <span className="landing-faq-icon" aria-hidden>
                      {opened ? <Minus size={18} strokeWidth={1.75} /> : <Plus size={18} strokeWidth={1.75} />}
                    </span>
                  </button>
                  {opened ? <p className="landing-faq-a">{item.a}</p> : null}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
