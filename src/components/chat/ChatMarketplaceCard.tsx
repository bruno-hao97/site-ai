import { Star } from 'lucide-react';
import {
  formatMarketplacePrice,
  type MarketplaceApp,
} from '../../services/miniAppsApi';

interface Props {
  app: MarketplaceApp;
  onView?: (app: MarketplaceApp) => void;
  className?: string;
}

export default function ChatMarketplaceCard({ app, onView, className = '' }: Props) {
  const priceLabel = formatMarketplacePrice(app);

  return (
    <article className={`chat-marketplace-card${className ? ` ${className}` : ''}`}>
      <div
        className="chat-marketplace-thumb"
        style={
          app.imageUrl
            ? {
                backgroundImage: `url(${app.imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : { background: `linear-gradient(135deg, ${app.accent}88, ${app.accent}22)` }
        }
        aria-hidden="true"
      />
      <div className="chat-marketplace-body">
        <strong>{app.title}</strong>
        {app.description ? <p>{app.description}</p> : null}
        <div className="chat-marketplace-meta">
          {app.rating > 0 ? (
            <span className="chat-marketplace-rating">
              <Star size={12} fill="currentColor" /> {app.rating.toFixed(1)}
            </span>
          ) : null}
          <span
            className={
              priceLabel === 'Free' ? 'chat-marketplace-free' : 'chat-marketplace-price'
            }
          >
            {priceLabel}
          </span>
        </div>
        <button
          type="button"
          className="chat-marketplace-view"
          onClick={() => onView?.(app)}
        >
          Xem
        </button>
      </div>
    </article>
  );
}
