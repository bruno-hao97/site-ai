import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/landing.css';
import { appEntryPath } from '../lib/landingConfig';
import { landingPageClassName } from '../lib/landingShell';
import { LandingAccessContext } from '../components/landing/LandingAccessContext';
import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSection from '../components/landing/HeroSection';
import ProductTabsSection from '../components/landing/ProductTabsSection';
import MarqueeSection from '../components/landing/MarqueeSection';
import CommunityGallerySection from '../components/landing/CommunityGallerySection';
import ModelCategoriesSection from '../components/landing/ModelCategoriesSection';
import VideoShowcaseSection from '../components/landing/VideoShowcaseSection';
import EnterpriseFeaturesSection from '../components/landing/EnterpriseFeaturesSection';
import PricingSection from '../components/landing/PricingSection';
import FaqSection from '../components/landing/FaqSection';
import FinalCtaSection from '../components/landing/FinalCtaSection';
import LandingFooter from '../components/landing/LandingFooter';

export default function LandingPage() {
  const navigate = useNavigate();

  const requestAccess = useCallback(() => {
    navigate(appEntryPath());
  }, [navigate]);

  return (
    <LandingAccessContext.Provider value={requestAccess}>
      <div className={landingPageClassName()}>
        <LandingNavbar />
        <HeroSection />
        <ProductTabsSection />
        <MarqueeSection />
        <CommunityGallerySection />
        <ModelCategoriesSection />
        <VideoShowcaseSection />
        <EnterpriseFeaturesSection />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
        <LandingFooter />
      </div>
    </LandingAccessContext.Provider>
  );
}
