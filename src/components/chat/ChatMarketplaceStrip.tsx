import { useEffect, useState } from 'react';
import ChatMarketplaceCard from './ChatMarketplaceCard';
import { fetchTopFreeMarketplaceApps, type MarketplaceApp } from '../../services/miniAppsApi';
import { isLoggedIn } from '../../services/authStore';
import { useLocale } from '../../i18n';

interface Props {
  onOpenApp?: (app: MarketplaceApp) => void;
  onViewAll?: () => void;
}

export default function ChatMarketplaceStrip({ onOpenApp, onViewAll }: Props) {
  const { t } = useLocale();
  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchTopFreeMarketplaceApps(4);
        if (!cancelled) setApps(data);
      } catch (e) {
        if (!cancelled) {
          setApps([]);
          setError(e instanceof Error ? e.message : t('chat.marketplace.error'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [t]);

  if (!isLoggedIn()) return null;

  return (
    <section className="chat-marketplace" aria-label={t('chat.marketplace.aria')}>
      <div className="chat-marketplace-head">
        <h2 className="chat-marketplace-heading">{t('chat.marketplace.heading')}</h2>
        {onViewAll ? (
          <button type="button" className="chat-marketplace-all" onClick={onViewAll}>
            {t('chat.marketplace.viewAll')}
          </button>
        ) : null}
      </div>
      {error ? <p className="chat-marketplace-error">{error}</p> : null}
      <div className="chat-marketplace-strip">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="chat-marketplace-card chat-marketplace-card--skeleton" aria-hidden="true">
                <div className="chat-marketplace-thumb" />
                <div className="chat-marketplace-body">
                  <span className="chat-marketplace-skeleton-line" />
                  <span className="chat-marketplace-skeleton-line chat-marketplace-skeleton-line--short" />
                </div>
              </div>
            ))
          : apps.map((app) => (
              <ChatMarketplaceCard key={app.id} app={app} onView={onOpenApp} />
            ))}
      </div>
    </section>
  );
}
