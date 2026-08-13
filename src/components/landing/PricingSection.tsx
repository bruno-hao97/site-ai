import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { fetchCreditPackages, type CreditPackage } from '../../services/topupApi';

const PREVIEW_COUNT = 3;

function creditRate(pkg: CreditPackage): number {
  return Math.round((pkg.credits / pkg.amountVnd) * 1000);
}

export default function PricingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void fetchCreditPackages()
      .then((rows) => {
        if (!active) return;
        setPackages(rows);
      })
      .catch((err) => {
        if (!active) return;
        setPackages([]);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const preview = useMemo(
    () => [...packages].sort((a, b) => a.amountVnd - b.amountVnd).slice(0, PREVIEW_COUNT),
    [packages],
  );

  return (
    <section
      id="pricing"
      className="landing-section landing-section-light landing-credit-preview"
      ref={ref}
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <div className="landing-section-head">
            <h2>Nạp credit — trả theo lần dùng</h2>
            <p>Không phí thuê bao. Chọn gói nạp, dùng cho ảnh, video, TTS, nhạc và mọi model trả phí.</p>
          </div>

          {loading ? (
            <div className="landing-credit-grid landing-credit-grid-loading">
              <Loader2 size={20} className="spin" />
              <span>Đang tải gói nạp credit…</span>
            </div>
          ) : null}

          {!loading && error ? (
            <p className="landing-credit-error">{error}</p>
          ) : null}

          {!loading && !error && preview.length ? (
            <div className="landing-credit-grid">
              {preview.map((pkg) => (
                <article
                  key={pkg.id}
                  className={`landing-credit-card${pkg.featured ? ' featured' : ''}`}
                >
                  {pkg.featured ? <span className="landing-credit-badge">Phổ biến</span> : null}
                  <div className="landing-credit-top">
                    <h3>{pkg.credits.toLocaleString('vi-VN')}</h3>
                    <span className="landing-credit-unit">Credits</span>
                  </div>
                  <p className="landing-credit-name">{pkg.name}</p>
                  <div className="landing-credit-tags">
                    <span>≈ {creditRate(pkg).toLocaleString('vi-VN')} credit / 1.000đ</span>
                    {pkg.bonusPercent > 0 ? (
                      <span className="landing-credit-bonus">+{pkg.bonusPercent}% thưởng</span>
                    ) : null}
                  </div>
                  <ul className="landing-credit-notes">
                    <li>Dùng cho mọi model trả phí trên studio</li>
                    {pkg.prioritySupport ? <li>Hỗ trợ ưu tiên</li> : null}
                  </ul>
                  <div className="landing-credit-foot">
                    <div className="landing-credit-price">
                      {pkg.credits > pkg.amountVnd ? (
                        <span>{pkg.credits.toLocaleString('vi-VN')}đ</span>
                      ) : null}
                      <strong>{pkg.amountVnd.toLocaleString('vi-VN')}đ</strong>
                    </div>
                    <Link to="/pricing" className="landing-credit-cta">
                      Mua gói này
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          <div className="landing-credit-expiry">
            <span>☆</span>
            <strong>Credit nạp có hiệu lực 3 tháng kể từ ngày nạp.</strong>
          </div>

          <div className="pricing-more-wrap">
            <Link to="/pricing" className="landing-link-btn">
              Xem tất cả gói nạp credit
              <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
