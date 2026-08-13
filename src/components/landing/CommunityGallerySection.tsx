import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useRef } from 'react';
import { useLandingFeedPreview } from '../../hooks/useLandingFeedPreview';
import { feedThumb } from '../../services/feedApi';

const PLACEHOLDER_COUNT = 11;

/** Magnific-style masonry: portrait / wide / square mix */
const GALLERY_LAYOUTS = [
  'portrait',
  'portrait',
  'wide',
  '',
  '',
  '',
  '',
  'wide',
  '',
  '',
  '',
] as const;

function galleryCellClass(index: number): string {
  const layout = GALLERY_LAYOUTS[index] ?? '';
  return `community-gallery-cell${layout ? ` ${layout}` : ''}`;
}

export default function CommunityGallerySection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const { items, loading } = useLandingFeedPreview(12);
  const galleryItems = items.slice(0, 11);

  return (
    <section id="community" className="landing-section landing-section-light community-gallery-section" ref={ref}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <div className="landing-section-head landing-section-head-row">
            <div>
              <h2>Cộng đồng sáng tạo</h2>
              <p>Ảnh và video thật từ người dùng Trung tâm AI.</p>
            </div>
            <a href="#community" className="landing-link-btn">
              Xem thêm
              <ArrowRight size={14} />
            </a>
          </div>

          <div className="community-gallery-grid">
            <Link to="/image" className="community-featured-card">
              <Sparkles size={22} />
              <h3>Bắt đầu tạo ảnh</h3>
              <p>Mở studio ảnh — chọn model và chạy thử ngay.</p>
              <span className="community-featured-cta">Vào studio ảnh</span>
            </Link>

            {loading
              ? Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
                  <div key={`ph-${i}`} className={`${galleryCellClass(i)} skeleton`} />
                ))
              : null}

            {!loading && galleryItems.length === 0
              ? Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
                  <div key={`empty-${i}`} className={`${galleryCellClass(i)} placeholder`}>
                    <span>Đang cập nhật</span>
                  </div>
                ))
              : null}

            {!loading
              ? galleryItems.map((item, index) => {
                  const thumb = feedThumb(item);
                  return (
                    <div
                      key={item.id_base}
                      className={galleryCellClass(index)}
                      style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}
                      role="img"
                      aria-label={item.type === 'image' ? 'Ảnh cộng đồng' : 'Video cộng đồng'}
                    >
                      {!thumb ? <span>{item.type === 'image' ? 'Ảnh' : 'Video'}</span> : null}
                    </div>
                  );
                })
              : null}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
