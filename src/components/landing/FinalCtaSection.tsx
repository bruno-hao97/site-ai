import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useRef } from 'react';
import { registerPathWithNext } from '../../lib/landingConfig';
import { SITE_DISPLAY_NAME } from '../../services/siteConfig';

const FINAL_CTA_IMAGE =
  'https://media.magnific.com/home/relaunch/media/start/start-2x.webp?w=1974&h=1175';

export default function FinalCtaSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="final-cta-section" ref={ref}>
      <div
        className="final-cta-bg"
        style={{ backgroundImage: `url('${FINAL_CTA_IMAGE}')` }}
        aria-hidden="true"
      />
      <div className="final-cta-overlay" aria-hidden="true" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="final-cta-inner"
      >
        <h2>{SITE_DISPLAY_NAME}</h2>
        <Link to={registerPathWithNext('/home')} className="final-cta-start-btn">
          Bắt đầu ngay
          <ArrowUpRight size={16} strokeWidth={2.25} />
        </Link>
      </motion.div>
    </section>
  );
}
