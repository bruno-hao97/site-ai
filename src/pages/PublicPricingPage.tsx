import { useEffect } from 'react';
import '../styles/landing.css';
import '../styles/pricing-magnific.css';
import { isLoggedIn } from '../services/authStore';
import { landingPageClassName } from '../lib/landingShell';
import LandingLayout from '../components/landing/LandingLayout';
import PricingPage from './PricingPage';

export default function PublicPricingPage() {
  useEffect(() => {
    document.title = 'Bảng giá · trungtamai.vn';
    return () => {
      document.title = 'Trung tâm AI';
    };
  }, []);

  if (isLoggedIn()) {
    return (
      <div className={landingPageClassName('landing-page--embedded')}>
        <main className="landing-main">
          <PricingPage />
        </main>
      </div>
    );
  }

  return (
    <LandingLayout>
      <PricingPage />
    </LandingLayout>
  );
}
