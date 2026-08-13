import { Link } from 'react-router-dom';
import {
  HOME_NOTIF_CONTACT,
  SITE_DISPLAY_NAME,
  SITE_SUPPORT_EMAIL,
  SITE_SUPPORT_PHONE,
  SITE_SUPPORT_PHONE_LABEL,
} from '../../services/siteConfig';

type FooterLink =
  | { label: string; to: string }
  | { label: string; href: string; external?: boolean };

const footerLinks: Record<string, FooterLink[]> = {
  'Nền tảng': [
    { label: 'Models', to: '/models' },
    { label: 'Tính năng', href: '/#product' },
    { label: 'Bảng giá', to: '/pricing' },
    { label: 'Khám phá', href: '/#community' },
  ],
  'Pháp lý & Hỗ trợ': [
    { label: 'Chính sách bảo mật', to: '/privacy' },
    { label: 'Điều khoản dịch vụ', to: '/terms' },
    { label: `Liên hệ: ${SITE_SUPPORT_PHONE_LABEL}`, href: `tel:${SITE_SUPPORT_PHONE}` },
    { label: `Email: ${SITE_SUPPORT_EMAIL}`, href: `mailto:${SITE_SUPPORT_EMAIL}` },
  ],
  'Bảng giá': [
    { label: 'Nạp credit', to: '/pricing' },
    { label: 'Gói dịch vụ', to: '/pricing' },
  ],
  'Công ty': [
    { label: 'Zalo hỗ trợ', href: HOME_NOTIF_CONTACT.zaloSupport, external: true },
    { label: 'Fanpage', href: HOME_NOTIF_CONTACT.facebook, external: true },
  ],
};

function FooterLinkItem({ link }: { link: FooterLink }) {
  if ('to' in link) {
    return <Link to={link.to}>{link.label}</Link>;
  }
  return (
    <a
      href={link.href}
      {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
    >
      {link.label}
    </a>
  );
}

export default function LandingFooter() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-logo-col">
            <Link to="/" className="logo-row" style={{ marginBottom: 12 }}>
              <img src="/logo.png" alt={SITE_DISPLAY_NAME} className="logo-img" />
            </Link>
            <p className="footer-tagline">
              Nền tảng AI đa phương thức — ảnh, video, âm nhạc, giọng nói và chat trong một studio.
            </p>
          </div>

          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading} className="footer-col">
              <h4>{heading}</h4>
              <ul>
                {links.map((link) => (
                  <li key={link.label}>
                    <FooterLinkItem link={link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <span className="copyright">
            © {new Date().getFullYear()} {SITE_DISPLAY_NAME}. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
