import { useEffect } from 'react';
import { isLoggedIn } from '../services/authStore';
import '../styles/landing.css';
import LandingLayout from '../components/landing/LandingLayout';
import ExplorePage from './ExplorePage';

export default function ExploreLandingPage() {
  useEffect(() => {
    document.title = 'Khám phá · trungtamai.vn';
    return () => {
      document.title = 'AI Center';
    };
  }, []);

  const feed = (
    <div className="explore-landing-wrap">
      <div className="container">
        <header className="explore-landing-head">
          <p className="model-dir-kicker">CỘNG ĐỒNG SÁNG TẠO</p>
          <h1>Khám phá tác phẩm AI</h1>
          <p className="model-dir-lead">
            Video và hình ảnh từ cộng đồng — lấy cảm hứng trước khi vào studio.
          </p>
        </header>
      </div>
      <ExplorePage />
    </div>
  );

  if (isLoggedIn()) return feed;

  return <LandingLayout>{feed}</LandingLayout>;
}
