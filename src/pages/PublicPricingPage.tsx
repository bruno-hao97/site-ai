import { useEffect } from 'react';
import '../styles/landing.css';
import '../styles/pricing-magnific.css';
import { isLoggedIn } from '../services/authStore';
import { landingPageClassName } from '../lib/landingShell';
import LandingLayout from '../components/landing/LandingLayout';
import PricingPage from './PricingPage';
import { useLocale } from '../i18n';

export default function PublicPricingPage() {
  const { t } = useLocale();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = t('pricing.pageTitle');
    return () => {
      document.title = 'Trung tâm AI';
    };
  }, [t]);

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
