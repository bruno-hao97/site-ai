import { useNavigate } from 'react-router-dom';
import {
  Coins,
  GitBranch,
  Image,
  LayoutGrid,
  MessageSquare,
  Mic,
  Music,
  Sparkles,
  Video,
  type LucideIcon,
} from 'lucide-react';
import type { HomeNewsAccent, HomeNewsCardView } from '../../lib/homeModelNews';
import type { ProductNewsKind } from '../../lib/homeProductNews';
import { useHomeNewsCards } from '../../hooks/useHomeNewsCards';
import { useHomeNewsThumbs } from '../../hooks/useHomeNewsThumbs';
import { useLocale } from '../../i18n';

const STATIC_ICON: Partial<Record<string, LucideIcon>> = {
  quickstart: Video,
  library: Image,
  workflow: GitBranch,
  chat: MessageSquare,
  audio: Mic,
  pricing: Coins,
};

const KIND_ICON: Record<ProductNewsKind, LucideIcon> = {
  feature: Sparkles,
  model: LayoutGrid,
  pricing: Coins,
  tip: Sparkles,
};

const ACCENT_ICON: Partial<Record<HomeNewsAccent, LucideIcon>> = {
  video: Video,
  image: Image,
  audio: Mic,
  music: Music,
};

function cardIcon(card: HomeNewsCardView): LucideIcon {
  if (card.source === 'static') {
    return STATIC_ICON[card.id] ?? KIND_ICON[card.kind as ProductNewsKind] ?? Sparkles;
  }
  return ACCENT_ICON[card.accent] ?? LayoutGrid;
}

function WhatsNewCard({
  card,
  bgUrl,
  onNavigate,
  newLabel,
}: {
  card: HomeNewsCardView;
  bgUrl?: string;
  onNavigate: (href: string) => void;
  newLabel: string;
}) {
  const Icon = cardIcon(card);
  const showBadge = card.showNewBadge || card.pinned;
  const hasBg = Boolean(bgUrl);

  return (
    <button
      type="button"
      className={[
        'home-whats-new-card',
        'home-whats-new-card--news',
        `home-whats-new-card--${card.accent}`,
        hasBg ? 'home-whats-new-card--has-bg' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onNavigate(card.href)}
    >
      {hasBg ? (
        <span
          className="home-whats-new-bg"
          style={{ backgroundImage: `url(${bgUrl})` }}
          aria-hidden
        />
      ) : null}
      <span className="home-whats-new-overlay">
        <span className="home-whats-new-top">
          {card.provider ? (
            <span className="home-whats-new-provider">{card.provider}</span>
          ) : null}
          {showBadge ? (
            <span className="home-whats-new-badge">
              {card.source === 'model' ? 'NEW' : newLabel}
            </span>
          ) : null}
          <span className="home-whats-new-type-icon" aria-hidden>
            <Icon size={15} strokeWidth={1.75} />
          </span>
        </span>
        <span className="home-whats-new-body">
          <span className="home-whats-new-label">{card.title}</span>
          <span className="home-whats-new-desc">{card.desc}</span>
          {card.tags?.length ? (
            <span className="home-whats-new-meta">
              {card.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="home-whats-new-tag">
                  {tag}
                </span>
              ))}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

export default function HomeWhatsNewStrip() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { cards, loading, error, catalogCount } = useHomeNewsCards();
  const thumbs = useHomeNewsThumbs(cards, !loading);
  const showDevHint =
    import.meta.env.DEV && !loading && catalogCount === 0 && Boolean(error);

  if (!loading && cards.length === 0) return null;

  return (
    <section className="home-whats-new" aria-label={t('home.section.whatsNew')}>
      <div className="home-whats-new-head">
        <h2 className="home-section-title">{t('home.section.whatsNew')}</h2>
      </div>
      {showDevHint ? (
        <p className="home-whats-new-dev-hint" role="status">
          Dev: catalog trống — {error}
        </p>
      ) : null}
      <div className="home-whats-new-track">
        {loading
          ? Array.from({ length: 4 }, (_, i) => (
              <div key={`sk-${i}`} className="home-whats-new-card home-whats-new-card--skeleton" />
            ))
          : cards.map((card) => (
              <WhatsNewCard
                key={card.id}
                card={card}
                bgUrl={thumbs[card.id]}
                onNavigate={navigate}
                newLabel={t('common.new')}
              />
            ))}
      </div>
    </section>
  );
}
