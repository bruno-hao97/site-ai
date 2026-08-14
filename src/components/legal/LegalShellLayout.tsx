import { Link, Outlet, useLocation } from 'react-router-dom';
import LandingLayout from '../landing/LandingLayout';
import { isLoggedIn } from '../../services/authStore';
import { landingPageClassName } from '../../lib/landingShell';
import { useLocale } from '../../i18n';
import '../../styles/legal.css';

function LegalSubnav() {
  const { pathname } = useLocation();
  const { t } = useLocale();
  const termsActive = pathname === '/terms';
  const privacyActive = pathname === '/privacy';

  return (
    <nav className="legal-subnav" aria-label={t('legal.subnav.aria')}>
      <Link to="/terms" className={termsActive ? 'active' : undefined}>
        {t('legal.terms.pageTitle')}
      </Link>
      <Link to="/privacy" className={privacyActive ? 'active' : undefined}>
        {t('legal.privacy.pageTitle')}
      </Link>
    </nav>
  );
}

export default function LegalShellLayout() {
  const loggedIn = isLoggedIn();

  if (loggedIn) {
    return (
      <div className={landingPageClassName('landing-page--embedded landing-page--legal')}>
        <main className="landing-main">
          <div className="legal-shell">
            <LegalSubnav />
            <Outlet />
          </div>
        </main>
      </div>
    );
  }

  return (
    <LandingLayout pageClassName="landing-page--legal">
      <div className="legal-shell">
        <LegalSubnav />
        <Outlet />
      </div>
    </LandingLayout>
  );
}
