import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon, Mail, Phone } from 'lucide-react';
import {
  SITE_DISPLAY_NAME,
  SITE_SUPPORT_EMAIL,
  SITE_SUPPORT_PHONE,
  SITE_SUPPORT_PHONE_LABEL,
} from '../../services/siteConfig';
import '../../styles/legal.css';

interface Props {
  title: string;
  icon: LucideIcon;
  active: 'privacy' | 'terms';
  children: ReactNode;
}

export default function LegalPageLayout({ title, icon: Icon, active, children }: Props) {
  return (
    <div className="legal-page">
      <nav className="legal-topbar" aria-label="Legal navigation">
        <Link to="/">Trang chủ</Link>
        <Link to="/terms" className={active === 'terms' ? 'active' : undefined}>
          Điều khoản dịch vụ
        </Link>
        <Link to="/privacy" className={active === 'privacy' ? 'active' : undefined}>
          Chính sách bảo mật
        </Link>
      </nav>

      <div className="legal-shell">
        <article className="legal-card">
          <header className="legal-card-head">
            <span className="legal-card-icon" aria-hidden>
              <Icon size={22} />
            </span>
            <h1>{title}</h1>
          </header>

          {children}

          <footer className="legal-contact">
            <p className="legal-contact-label">LIÊN HỆ HỖ TRỢ</p>
            <div className="legal-contact-row">
              <a className="legal-contact-item" href={`tel:${SITE_SUPPORT_PHONE}`}>
                <Phone size={16} />
                {SITE_SUPPORT_PHONE_LABEL}
              </a>
              <a className="legal-contact-item" href={`mailto:${SITE_SUPPORT_EMAIL}`}>
                <Mail size={16} />
                {SITE_SUPPORT_EMAIL}
              </a>
            </div>
          </footer>
        </article>

        <p className="legal-page-footer">
          © {new Date().getFullYear()} {SITE_DISPLAY_NAME}. Đã đăng ký bản quyền.
        </p>
      </div>
    </div>
  );
}
