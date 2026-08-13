import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/landing.css';
import { isLoggedIn } from '../../services/authStore';
import { appEntryPath } from '../../lib/landingConfig';
import { landingPageClassName } from '../../lib/landingShell';
import { LandingAccessContext } from './LandingAccessContext';
import LandingNavbar from './LandingNavbar';
import LandingFooter from './LandingFooter';

interface Props {
  children: React.ReactNode;
  /** Extra class on `.landing-page` (e.g. `landing-page--legal`). */
  pageClassName?: string;
}

export default function LandingLayout({ children, pageClassName }: Props) {
  const navigate = useNavigate();

  const requestAccess = useCallback(() => {
    navigate(appEntryPath());
  }, [navigate]);

  return (
    <LandingAccessContext.Provider value={requestAccess}>
      <div className={landingPageClassName(pageClassName)}>
        <LandingNavbar />
        <main className="landing-main">{children}</main>
        <LandingFooter />
      </div>
    </LandingAccessContext.Provider>
  );
}

export function useLandingCta() {
  const navigate = useNavigate();

  return useCallback(
    (next?: string) => {
      if (isLoggedIn()) {
        navigate(next || '/home');
        return;
      }
      navigate(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
    },
    [navigate],
  );
}
