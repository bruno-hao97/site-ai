import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/landing.css';
import { appEntryPath } from '../lib/landingConfig';
import LandingAccessNoticeModal from '../components/landing/LandingAccessNoticeModal';
import { LandingAccessContext } from '../components/landing/LandingAccessContext';
import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSection from '../components/landing/HeroSection';
import MarqueeSection from '../components/landing/MarqueeSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import MultimodalSection from '../components/landing/MultimodalSection';
import ModelsSection from '../components/landing/ModelsSection';
import PricingSection from '../components/landing/PricingSection';
import LandingFooter from '../components/landing/LandingFooter';

export default function LandingPage() {
  const navigate = useNavigate();
  const [noticeOpen, setNoticeOpen] = useState(true);

  const requestAccess = useCallback(() => {
    navigate(appEntryPath());
  }, [navigate]);

  const dismissNotice = useCallback(() => {
    setNoticeOpen(false);
  }, []);

  return (
    <LandingAccessContext.Provider value={requestAccess}>
      <div className="landing-page">
        <LandingNavbar />
        <HeroSection />
        <MarqueeSection />
        <FeaturesSection />
        <MultimodalSection />
        <ModelsSection />
        <PricingSection />
        <LandingFooter />

        <LandingAccessNoticeModal
          open={noticeOpen}
          onConfirm={dismissNotice}
          onClose={dismissNotice}
        />
      </div>
    </LandingAccessContext.Provider>
  );
}
