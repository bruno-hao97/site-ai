import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Code2,
  Image as ImageIcon,
  MessageSquare,
  Mic,
  Music,
  Sparkles,
  Star,
  Video,
  Wand2,
  Zap,
} from 'lucide-react';
import '../styles/landing.css';
import LandingLayout, { useLandingCta } from '../components/landing/LandingLayout';
import MarqueeSection from '../components/landing/MarqueeSection';
import { useModelCatalog } from '../hooks/useModelCatalog';
import { catalogByJobTypes } from '../services/modelCatalog';
import { buildNewModelChecker, modelLabel, topModelNames } from '../services/modelCatalogDisplay';
import { CHAT_AI_MODELS } from '../services/chatAiModels';

const CHAT_FEATURES = [
  {
    icon: MessageSquare,
    title: 'Chat đa model',
    desc: 'GPT, Claude, DeepSeek — đổi model một cú click.',
  },
  {
    icon: ImageIcon,
    title: 'Phân tích hình ảnh',
    desc: 'Đính kèm ảnh — nhận diện, mô tả và trích thông tin.',
  },
  {
    icon: Code2,
    title: 'Viết code',
    desc: 'Draft nhanh, giải thích logic — đa ngôn ngữ lập trình.',
  },
  {
    icon: Wand2,
    title: 'Suy luận sâu',
    desc: 'Model reasoning — phân tích phức tạp, từng bước.',
  },
];

const IMAGE_FEATURES = [
  { title: 'Tạo Ảnh AI', desc: 'FLUX, Imagen-class — photorealistic từ một dòng mô tả.' },
  { title: 'Chỉnh Sửa Ảnh', desc: 'Inpaint, thay nền, style transfer — giữ layout gốc.' },
  { title: 'Poster Marketing', desc: 'Banner, poster, visual social — typography có sẵn.' },
  { title: 'Thời Trang Ảo', desc: 'Lookbook, try-on — cho e-commerce & brand.' },
];

const AUDIO_FEATURES = [
  { title: 'Text-to-Speech', desc: 'Giọng tự nhiên, đa ngôn ngữ — gắn thẳng vào video.' },
  { title: 'Tạo Nhạc AI', desc: 'Nhạc nền, jingle, soundtrack theo mood bạn chọn.' },
];

const VIDEO_FEATURES = [
  { title: 'Text-to-Video', desc: 'Prompt → video 1080p. Kling, Luma, Hailuo.' },
  { title: 'Image-to-Video', desc: 'Ảnh tĩnh thành chuyển động — giữ nhân vật, giữ bối cảnh.' },
  { title: 'Avatar Lipsync', desc: 'Ảnh + audio → avatar nói, đa ngôn ngữ.' },
  { title: 'Video Upscale', desc: 'Nâng lên 4K, khôi phục chi tiết.' },
];

export default function FeaturedPage() {
  const cta = useLandingCta();
  const { available, count, loading } = useModelCatalog();

  useEffect(() => {
    document.title = 'Tính năng · trungtamai.vn';
    return () => {
      document.title = 'AI Center';
    };
  }, []);

  const imageModels = useMemo(() => catalogByJobTypes(available, ['image']), [available]);
  const videoModels = useMemo(() => catalogByJobTypes(available, ['video', 'avatar-lipsync']), [available]);
  const audioModels = useMemo(() => catalogByJobTypes(available, ['tts', 'music']), [available]);

  const isNew = useMemo(() => buildNewModelChecker(available.map((e) => e.model)), [available]);
  const newest = useMemo(() => {
    const sorted = [...available].sort(
      (a, b) => (b.model.created_time ?? 0) - (a.model.created_time ?? 0),
    );
    return sorted.filter((e) => isNew(e.model)).slice(0, 2);
  }, [available, isNew]);

  const heroBadge =
    newest.length >= 2
      ? `${modelLabel(newest[0]!.model)} & ${modelLabel(newest[1]!.model)}`
      : newest.length === 1
        ? modelLabel(newest[0]!.model)
        : topModelNames(videoModels.map((e) => e.model), 2) || '50+ model AI';

  const chatModelNames = CHAT_AI_MODELS.filter((m) => m.selectable)
    .slice(0, 4)
    .map((m) => m.name)
    .join(' · ');

  const stats = [
    { num: loading ? '…' : `${count || 50}+`, label: 'AI Models' },
    { num: '10K+', label: 'Người dùng' },
    { num: '99.9%', label: 'Uptime' },
    { num: '<100ms', label: 'Độ trễ' },
  ];

  return (
    <LandingLayout showNotice>
      <section className="featured-hero">
        <div className="container featured-hero-inner">
          <span className="featured-hero-badge">
            <Sparkles size={14} />
            NỀN TẢNG AI TOÀN DIỆN
          </span>
          <h1>
            Một studio.
            <br />
            Mọi loại nội dung.
          </h1>
          <p className="featured-hero-lead">
            Ảnh, video, giọng nói, nhạc — {loading ? '50+' : count || 50}+ model, một giao diện, trả
            theo credits.
          </p>

          <div className="featured-stats">
            {stats.map((s) => (
              <div key={s.label} className="featured-stat">
                <strong>{s.num}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          <div className="featured-hero-actions">
            <button type="button" className="btn-primary" onClick={() => cta('/register')}>
              <Zap size={16} />
              Bắt đầu ngay
            </button>
            <Link to="/models" className="btn-secondary">
              Xem Models
              <ArrowRight size={16} />
            </Link>
          </div>

          {!loading && heroBadge ? (
            <p className="featured-hero-note">
              Model mới: <strong>{heroBadge}</strong>
            </p>
          ) : null}
        </div>
      </section>

      <MarqueeSection />

      <section className="featured-block">
        <div className="container featured-split">
          <div className="featured-copy">
            <span className="featured-kicker">AI Chat &amp; Assistant</span>
            <h2>Hỏi, viết, code — một cửa sổ</h2>
            <p>Trợ lý đa model — ảnh, code, suy luận trong một chat.</p>
            {chatModelNames ? <p className="featured-model-line">{chatModelNames}</p> : null}
          </div>
          <div className="featured-card-grid">
            {CHAT_FEATURES.map((item) => (
              <article key={item.title} className="featured-mini-card">
                <item.icon size={20} className="featured-mini-icon" />
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="featured-block featured-block-center">
        <div className="container">
          <p className="featured-kicker muted">THIẾT KẾ &amp; TẠO ẢNH</p>
          <h2>Ảnh đẹp, chỉnh được</h2>
          <p className="featured-section-lead">
            Sinh ảnh, sửa thông minh, poster và lookbook — một studio.
          </p>
          {!loading && imageModels.length ? (
            <p className="featured-model-line">{topModelNames(imageModels.map((e) => e.model), 4)}</p>
          ) : null}
          <div className="featured-row-cards">
            {IMAGE_FEATURES.map((item) => (
              <article key={item.title} className="featured-row-card">
                <ImageIcon size={18} />
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="featured-block featured-block-center">
        <div className="container">
          <p className="featured-kicker muted">ÂM NHẠC &amp; GIỌNG NÓI</p>
          <h2>Giọng nói và nhạc hoàn chỉnh</h2>
          <p className="featured-section-lead">TTS tự nhiên, nhạc theo mood — gắn thẳng vào video.</p>
          {!loading && audioModels.length ? (
            <p className="featured-model-line">{topModelNames(audioModels.map((e) => e.model), 3)}</p>
          ) : null}
          <div className="featured-duo-cards">
            {AUDIO_FEATURES.map((item, i) => (
              <article key={item.title} className="featured-duo-card">
                {i === 0 ? <Mic size={22} /> : <Music size={22} />}
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="featured-block">
        <div className="container featured-split featured-split-reverse">
          <div className="featured-card-grid">
            {VIDEO_FEATURES.map((item) => (
              <article key={item.title} className="featured-mini-card">
                <Video size={20} className="featured-mini-icon" />
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
          <div className="featured-copy">
            <span className="featured-kicker">AI Video Studio</span>
            <h2>Video trong vài phút</h2>
            <p>Từ prompt hoặc ảnh tĩnh — avatar, upscale, xuất 1080p.</p>
            {!loading && videoModels.length ? (
              <p className="featured-model-line">{topModelNames(videoModels.map((e) => e.model), 4)}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="featured-cta">
        <div className="container">
          <div className="featured-cta-box">
            <Star size={22} className="featured-cta-star" />
            <h2>Sẵn sàng tạo thử?</h2>
            <p>
              Đăng ký miễn phí — không cần thẻ. Vào studio và chạy model đầu tiên trong phút.
            </p>
            <div className="featured-cta-tags">
              <span>{loading ? '50+' : count || 50}+ model</span>
              <span>Credits minh bạch</span>
              <span>Studio · Workflow · API</span>
            </div>
            <div className="featured-hero-actions">
              <button type="button" className="btn-primary" onClick={() => cta('/register')}>
                Bắt đầu miễn phí
                <ArrowRight size={16} />
              </button>
              <Link to="/pricing" className="btn-secondary">
                Xem bảng giá
              </Link>
            </div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}
