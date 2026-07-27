import { useState } from 'react';
import HomeFeed from '../components/HomeFeed';
import HomeFavoritesFeed from '../components/HomeFavoritesFeed';
import HomeMyContent, { type MineFilter } from '../components/HomeMyContent';
import HomePublicFeed from '../components/HomePublicFeed';
import HomeQuickCreateBar from '../components/HomeQuickCreateBar';

const HOME_TABS = [
  'Bảng tin',
  'Của tôi',
  'Hướng cho bạn',
  'Videos',
  'Hình ảnh',
  'Nhạc',
  'Âm thanh',
  'Yêu thích',
] as const;

type HomeTab = (typeof HOME_TABS)[number];

const MINE_TABS: Partial<Record<HomeTab, MineFilter>> = {
  'Của tôi': 'all',
  Videos: 'video',
  'Hình ảnh': 'image',
  Nhạc: 'music',
  'Âm thanh': 'tts',
};

export default function HomePage() {
  const [tab, setTab] = useState<HomeTab>('Bảng tin');
  const mineFilter = MINE_TABS[tab];

  return (
    <div className="home-explore home-explore--has-qc">
      <div className="home-tabs" role="tablist" aria-label="Home">
        {HOME_TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`home-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Yêu thích' ? (
        <HomeFavoritesFeed />
      ) : mineFilter ? (
        <HomeMyContent key={mineFilter} filter={mineFilter} />
      ) : tab === 'Hướng cho bạn' ? (
        <HomePublicFeed />
      ) : (
        <HomeFeed />
      )}

      <div className="home-quick-create-dock">
        <HomeQuickCreateBar />
      </div>
    </div>
  );
}
