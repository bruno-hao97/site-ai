import { useEffect } from 'react';
import { isLoggedIn } from '../services/authStore';
import '../styles/landing.css';
import LandingLayout from '../components/landing/LandingLayout';
import PricingPage from './PricingPage';

export default function PublicPricingPage() {
  useEffect(() => {
    document.title = 'Bảng giá · trungtamai.vn';
    return () => {
      document.title = 'AI Center';
    };
  }, []);

  const page = <PricingPage />;

  if (isLoggedIn()) return page;

  return <LandingLayout>{page}</LandingLayout>;
}
