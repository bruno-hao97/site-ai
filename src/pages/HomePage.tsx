import { useState } from 'react';
import HomeNewsCarousel from '../components/HomeNewsCarousel';
import HomeFeed from '../components/HomeFeed';

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

export default function HomePage() {
  const [tab, setTab] = useState<(typeof HOME_TABS)[number]>('Bảng tin');

  return (
    <div className="home-explore">
      <div className="home-tabs">
        {HOME_TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`home-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'Bảng tin' && <HomeNewsCarousel />}
      {tab === 'Của tôi' && (
        <p className="muted home-news-status">Chưa có dữ liệu cho “Của tôi”.</p>
      )}
      <HomeFeed />
    </div>
  );
}
