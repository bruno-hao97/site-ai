import { Link, Outlet, useLocation } from 'react-router-dom';
import LandingLayout from '../landing/LandingLayout';
import '../../styles/legal.css';

export default function LegalShellLayout() {
  const { pathname } = useLocation();
  const termsActive = pathname === '/terms';
  const privacyActive = pathname === '/privacy';

  return (
    <LandingLayout>
      <div className="legal-shell">
        <nav className="legal-subnav" aria-label="Pháp lý">
          <Link to="/terms" className={termsActive ? 'active' : undefined}>
            Điều khoản dịch vụ
          </Link>
          <Link to="/privacy" className={privacyActive ? 'active' : undefined}>
            Chính sách bảo mật
          </Link>
        </nav>

        <Outlet />
      </div>
    </LandingLayout>
  );
}
