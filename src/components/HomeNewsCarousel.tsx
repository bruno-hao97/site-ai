import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isLoggedIn } from '../services/authStore';
import {
  fetchAllNews,
  formatNewsDate,
  stripHtml,
  type NewsItem,
} from '../services/newsApi';
import { UpstreamMeError } from '../services/upstreamMe';

function newsExcerpt(item: NewsItem, max = 90): string {
  const text = stripHtml(item.content);
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function newsImage(item: NewsItem): string | null {
  if (item.thumbnail?.trim()) return item.thumbnail;
  const first = item.attachments?.find((a) => a.type === 'image' && a.url);
  return first?.url || null;
}

export default function HomeNewsCarousel() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) {
      setLoading(false);
      setError('Chưa đăng nhập.');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    fetchAllNews(5)
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof UpstreamMeError ? err.message : String(err));
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function scrollBy(dir: -1 | 1) {
    const el = document.getElementById('home-news-carousel');
    if (!el) return;
    el.scrollBy({ left: dir * 300, behavior: 'smooth' });
  }

  if (loading) {
    return <p className="muted home-news-status">Đang tải bảng tin…</p>;
  }

  if (error) {
    return <p className="error home-news-status">{error}</p>;
  }

  if (!items.length) {
    return <p className="muted home-news-status">Chưa có tin tức.</p>;
  }

  return (
    <section className="home-news-section" aria-label="Bảng tin">
      <div className="home-news-carousel-wrap">
        <button
          type="button"
          className="home-news-nav home-news-nav-prev"
          aria-label="Trước"
          onClick={() => scrollBy(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <div id="home-news-carousel" className="news-carousel">
          {items.map((item) => {
            const img = newsImage(item);
            const badge = item.is_new === '1' ? 'MỚI' : 'TIN';
            return (
              <article key={item.id_base} className="news-card">
                <div
                  className="news-card-media"
                  style={img ? { backgroundImage: `url(${img})` } : undefined}
                >
                  {!img && <span className="news-card-placeholder">TIN</span>}
                  <span className="news-badge">{badge}</span>
                </div>
                <div className="news-card-body">
                  <h3 className="news-card-title" title={item.title}>
                    {item.title}
                  </h3>
                  {newsExcerpt(item) && (
                    <p className="news-card-excerpt">{newsExcerpt(item)}</p>
                  )}
                  <time className="news-card-date">{formatNewsDate(item.created_at)}</time>
                </div>
              </article>
            );
          })}
        </div>
        <button
          type="button"
          className="home-news-nav home-news-nav-next"
          aria-label="Sau"
          onClick={() => scrollBy(1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
