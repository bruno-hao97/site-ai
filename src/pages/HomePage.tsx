import { useState } from 'react';
import { LayoutGrid, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import HomeFeed from '../components/HomeFeed';
import HomePublicFeed from '../components/HomePublicFeed';
import HomeHero from '../components/home/HomeHero';
import HomeProjectsPanel from '../components/home/HomeProjectsPanel';
import HomeWhatsNewStrip from '../components/home/HomeWhatsNewStrip';
import HomeCategoryIcon from '../components/home/HomeCategoryIcon';
import { HOME_QUICK_MENU } from '../lib/homeQuickMenu';
import { useLocale } from '../i18n';
import type { TranslationKey } from '../i18n/types';
import type { CommunityTypeFilter } from '../services/feedApi';

type ExploreFilter = 'feed' | 'foryou' | 'videos' | 'images' | 'music' | 'audio';

interface ExploreFilterDef {
  id: ExploreFilter;
  labelKey: TranslationKey;
  communityType: CommunityTypeFilter;
  icon: LucideIcon;
  tint: string;
}

const menuById = Object.fromEntries(HOME_QUICK_MENU.map((item) => [item.id, item]));

const EXPLORE_FILTERS: ExploreFilterDef[] = [
  {
    id: 'feed',
    labelKey: 'home.filter.feed',
    communityType: 'all',
    icon: LayoutGrid,
    tint: 'rgba(255, 255, 255, 0.08)',
  },
  {
    id: 'foryou',
    labelKey: 'home.filter.foryou',
    communityType: 'all',
    icon: Sparkles,
    tint: 'rgba(234, 179, 8, 0.12)',
  },
  {
    id: 'videos',
    labelKey: 'home.filter.videos',
    communityType: 'video',
    icon: menuById.video!.icon,
    tint: menuById.video!.tint,
  },
  {
    id: 'images',
    labelKey: 'home.filter.images',
    communityType: 'image',
    icon: menuById.image!.icon,
    tint: menuById.image!.tint,
  },
  {
    id: 'music',
    labelKey: 'home.filter.music',
    communityType: 'music',
    icon: menuById.music!.icon,
    tint: menuById.music!.tint,
  },
  {
    id: 'audio',
    labelKey: 'home.filter.audio',
    communityType: 'tts',
    icon: menuById.audio!.icon,
    tint: menuById.audio!.tint,
  },
];

export default function HomePage() {
  const { t } = useLocale();
  const [filter, setFilter] = useState<ExploreFilter>('feed');
  const active = EXPLORE_FILTERS.find((f) => f.id === filter)!;

  return (
    <div className="home-dashboard">
      <HomeHero />

      <HomeProjectsPanel />

      <HomeWhatsNewStrip />

      <section className="home-explore-section" id="home-explore">
        <div className="home-explore-head">
          <h2 className="home-section-title">{t('home.section.explore')}</h2>
          <div className="home-explore-filters" role="tablist" aria-label={t('home.section.explore')}>
            {EXPLORE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                className={`home-explore-filter${filter === f.id ? ' active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                <HomeCategoryIcon icon={f.icon} tint={f.tint} size="sm" />
                <span>{t(f.labelKey)}</span>
              </button>
            ))}
          </div>
        </div>

        {filter === 'foryou' ? (
          <HomePublicFeed typeFilter={active.communityType} />
        ) : (
          <HomeFeed key={active.communityType} typeFilter={active.communityType} />
        )}
      </section>
    </div>
  );
}
