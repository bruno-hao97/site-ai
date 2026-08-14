import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import ChatMarketplaceCard from './ChatMarketplaceCard';
import {
  MARKETPLACE_TABS,
  fetchMarketplaceMiniApps,
  filterMarketplaceByTab,
  mapMiniAppToMarketplaceApp,
  type MarketplaceApp,
  type MarketplaceTabType,
  type MiniAppItem,
} from '../../services/miniAppsApi';
import { useLocale } from '../../i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenApp: (app: MarketplaceApp) => void;
}

export default function ChatMarketsModal({ open, onClose, onOpenApp }: Props) {
  const { t } = useLocale();
  const [tab, setTab] = useState<MarketplaceTabType>('all');
  const [query, setQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [rawItems, setRawItems] = useState<MiniAppItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTab = MARKETPLACE_TABS.find((t) => t.id === tab) ?? MARKETPLACE_TABS[0];

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setDebouncedSearch(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMarketplaceMiniApps(debouncedSearch);
        if (!cancelled) setRawItems(data);
      } catch (e) {
        if (!cancelled) {
          setRawItems([]);
          setError(e instanceof Error ? e.message : t('chat.markets.loadError'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, debouncedSearch, t]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const items = useMemo(() => {
    return filterMarketplaceByTab(rawItems, tab)
      .map(mapMiniAppToMarketplaceApp)
      .filter((app): app is MarketplaceApp => app != null);
  }, [rawItems, tab]);

  const handleOpenApp = (app: MarketplaceApp) => {
    onOpenApp(app);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="chat-markets-overlay" onClick={onClose}>
      <div
        className="chat-markets-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('chat.markets.aria')}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="chat-markets-head">
          <div>
            <h3>{t('chat.markets.title')}</h3>
            <p>{t('chat.markets.lead')}</p>
          </div>
          <button type="button" className="chat-markets-x" onClick={onClose} aria-label={t('chat.markets.close')}>
            <X size={18} />
          </button>
        </header>

        <div className="chat-markets-toolbar">
          <div className="chat-markets-tabs" role="tablist">
            {MARKETPLACE_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={tab === item.id ? 'active' : ''}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="chat-markets-search-wrap">
            <span className="chat-markets-filter-icon" aria-hidden="true">
              <SlidersHorizontal size={15} />
            </span>
            <div className="chat-markets-search">
              <Search size={15} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('chat.markets.searchPlaceholder')}
                autoFocus
              />
            </div>
          </div>
        </div>

        <div className="chat-markets-body">
          <h4 className="chat-markets-section-title">{activeTab.sectionTitle}</h4>

          {loading ? (
            <div className="chat-markets-grid chat-markets-grid--loading">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="chat-markets-skeleton" aria-hidden="true" />
              ))}
            </div>
          ) : error ? (
            <div className="chat-markets-empty">{error}</div>
          ) : items.length === 0 ? (
            <div className="chat-markets-empty">{t('chat.markets.empty')}</div>
          ) : (
            <div className="chat-markets-grid">
              {items.map((app) => (
                <ChatMarketplaceCard
                  key={app.id}
                  app={app}
                  className="chat-marketplace-card--grid"
                  onView={handleOpenApp}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
