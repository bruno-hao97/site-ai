import { Star } from 'lucide-react';
import { CHAT_MARKETPLACE_APPS } from '../../services/chatPageData';

interface Props {
  onOpenApp?: (appId: string) => void;
}

export default function ChatMarketplaceStrip({ onOpenApp }: Props) {
  return (
    <section className="chat-marketplace" aria-label="Top miễn phí">
      <h2 className="chat-marketplace-heading">TOP MIỄN PHÍ</h2>
      <div className="chat-marketplace-strip">
        {CHAT_MARKETPLACE_APPS.map((app) => (
          <article key={app.id} className="chat-marketplace-card">
            <div
              className="chat-marketplace-thumb"
              style={{ background: `linear-gradient(135deg, ${app.accent}88, ${app.accent}22)` }}
              aria-hidden="true"
            />
            <div className="chat-marketplace-body">
              <strong>{app.title}</strong>
              <p>{app.description}</p>
              <div className="chat-marketplace-meta">
                <span className="chat-marketplace-rating">
                  <Star size={12} fill="currentColor" /> {app.rating.toFixed(1)}
                </span>
                {app.free && <span className="chat-marketplace-free">Free</span>}
              </div>
              <button
                type="button"
                className="chat-marketplace-view"
                onClick={() => onOpenApp?.(app.id)}
              >
                Xem
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
