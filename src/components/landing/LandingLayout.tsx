import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/landing.css';
import { isLoggedIn } from '../../services/authStore';
import { appEntryPath } from '../../lib/landingConfig';
import { LandingAccessContext } from './LandingAccessContext';
import LandingNavbar from './LandingNavbar';
import LandingFooter from './LandingFooter';
import LandingAccessNoticeModal from './LandingAccessNoticeModal';

interface Props {
  children: React.ReactNode;
  showNotice?: boolean;
}

export default function LandingLayout({ children, showNotice = false }: Props) {
  const navigate = useNavigate();
  const [noticeOpen, setNoticeOpen] = useState(showNotice);

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
        <main className="landing-main">{children}</main>
        <LandingFooter />

        {showNotice ? (
          <LandingAccessNoticeModal
            open={noticeOpen}
            onConfirm={dismissNotice}
            onClose={dismissNotice}
          />
        ) : null}
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
