import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import HomeMyContent, { type MineFilter } from '../components/HomeMyContent';
import HomeCategoryIcon from '../components/home/HomeCategoryIcon';
import { usePendingTabCounts } from '../hooks/usePendingJobs';
import { HOME_QUICK_MENU } from '../lib/homeQuickMenu';
import { useLocale } from '../i18n';
import type { TranslationKey } from '../i18n/types';

type LibraryTypeTab = Exclude<MineFilter, 'all' | 'favorite'>;

interface TypeTabDef {
  id: LibraryTypeTab;
  labelKey: TranslationKey;
  icon: (typeof HOME_QUICK_MENU)[number]['icon'];
  tint: string;
}

const menuById = Object.fromEntries(HOME_QUICK_MENU.map((item) => [item.id, item]));

const TYPE_TABS: TypeTabDef[] = [
  {
    id: 'image',
    labelKey: 'home.filter.images',
    icon: menuById.image!.icon,
    tint: menuById.image!.tint,
  },
  {
    id: 'video',
    labelKey: 'home.filter.videos',
    icon: menuById.video!.icon,
    tint: menuById.video!.tint,
  },
  {
    id: 'tts',
    labelKey: 'home.filter.audio',
    icon: menuById.audio!.icon,
    tint: menuById.audio!.tint,
  },
  {
    id: 'music',
    labelKey: 'home.filter.music',
    icon: menuById.music!.icon,
    tint: menuById.music!.tint,
  },
];

function parseType(raw: string | null): LibraryTypeTab {
  if (raw === 'video' || raw === 'tts' || raw === 'music') return raw;
  return 'image';
}

export default function LibraryPage() {
  const { t } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const [typeTab, setTypeTab] = useState<LibraryTypeTab>(() => parseType(searchParams.get('type')));

  useEffect(() => {
    const next = new URLSearchParams();
    next.set('type', typeTab);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeTab]);

  const pendingByTab = usePendingTabCounts();
  const activeType = TYPE_TABS.find((tab) => tab.id === typeTab)!;

  return (
    <div className="library-dashboard">
      <header className="library-head">
        <h1 className="library-title">{t('library.pageTitle')}</h1>
        <p className="library-lead">{t('library.pageLead')}</p>

        <div className="library-type-tabs" role="tablist" aria-label={t('library.pageTitle')}>
          {TYPE_TABS.map((tab) => {
            const creatingCount = pendingByTab[tab.id];
            const isCreating = creatingCount > 0;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={typeTab === tab.id}
                className={`library-type-tab${typeTab === tab.id ? ' active' : ''}${isCreating ? ' is-creating' : ''}`}
                onClick={() => setTypeTab(tab.id)}
              >
                <HomeCategoryIcon icon={tab.icon} tint={tab.tint} size="sm" />
                <span>{t(tab.labelKey)}</span>
                {isCreating && (
                  <span className="library-type-tab-creating">
                    <span className="library-type-tab-creating-dot" aria-hidden />
                    {t('studio.pending.section')}
                    {creatingCount > 1 ? ` (${creatingCount})` : ''}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <HomeMyContent key={typeTab} filter={activeType.id} statusFilter="success" />
    </div>
  );
}
