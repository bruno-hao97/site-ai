import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { CircleDollarSign, Phone } from 'lucide-react';
import { useLocale } from '../../i18n';
import {
  HOME_NOTIF_CONTACT,
  SITE_DISPLAY_NAME,
  SITE_SUPPORT_EMAIL,
  SITE_SUPPORT_PHONE,
  SITE_SUPPORT_PHONE_LABEL,
} from '../../services/siteConfig';

type FooterLink =
  | { label: string; to: string; key: string }
  | { label: string; href: string; key: string; external?: boolean };

type FooterAction =
  | { key: string; label: string; to: string; icon: ReactNode }
  | { key: string; label: string; href: string; icon: ReactNode; external?: boolean };

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

function FooterActionButton({ action }: { action: FooterAction }) {
  const className = 'footer-action';
  const icon = <span className="footer-action-icon">{action.icon}</span>;

  if ('to' in action) {
    return (
      <Link to={action.to} className={className} aria-label={action.label} title={action.label}>
        {icon}
      </Link>
    );
  }

  return (
    <a
      href={action.href}
      className={className}
      aria-label={action.label}
      title={action.label}
      {...(action.external ? { target: '_blank', rel: 'noreferrer' } : {})}
    >
      {icon}
    </a>
  );
}

function ZaloIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden fill="currentColor">
      <path d="M12.49 10.002c-.927 0-1.676.748-1.676 1.676s.749 1.676 1.676 1.676 1.676-.748 1.676-1.676-.749-1.676-1.676-1.676zm-4.908 0c-.927 0-1.676.748-1.676 1.676s.749 1.676 1.676 1.676 1.676-.748 1.676-1.676-.749-1.676-1.676-1.676zm9.816 0c-.927 0-1.676.748-1.676 1.676s.749 1.676 1.676 1.676 1.676-.748 1.676-1.676-.749-1.676-1.676-1.676zM12 2C6.477 2 2 5.924 2 10.845c0 2.467 1.128 4.674 2.898 6.17L3.5 21.5l4.314-2.366c1.053.292 2.17.45 3.336.45 5.523 0 10-3.924 10-8.845S17.523 2 12 2z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export default function LandingFooter() {
  const { t } = useLocale();

  const footerActions = useMemo<FooterAction[]>(
    () => [
      {
        key: 'zalo',
        label: t('landing.footer.link.zalo'),
        href: HOME_NOTIF_CONTACT.zaloSupport,
        external: true,
        icon: <ZaloIcon />,
      },
      {
        key: 'phone',
        label: t('landing.footer.link.contactPhone', { phone: SITE_SUPPORT_PHONE_LABEL }),
        href: `tel:${SITE_SUPPORT_PHONE}`,
        icon: <Phone size={18} strokeWidth={1.75} aria-hidden />,
      },
      {
        key: 'fanpage',
        label: t('landing.footer.link.fanpage'),
        href: HOME_NOTIF_CONTACT.facebook,
        external: true,
        icon: <FacebookIcon />,
      },
      {
        key: 'pricing',
        label: t('landing.footer.link.pricing'),
        to: '/pricing',
        icon: <CircleDollarSign size={18} strokeWidth={1.75} aria-hidden />,
      },
    ],
    [t],
  );

  const footerColumns = useMemo(
    () => [
      {
        heading: t('landing.footer.col.platform'),
        links: [
          { key: 'models', label: t('landing.footer.link.models'), to: '/models' },
          { key: 'features', label: t('landing.footer.link.features'), href: '/#product' },
          { key: 'pricing', label: t('landing.footer.link.pricing'), to: '/pricing' },
          { key: 'explore', label: t('landing.footer.link.explore'), href: '/#community' },
        ],
      },
      {
        heading: t('landing.footer.col.legal'),
        links: [
          { key: 'privacy', label: t('landing.footer.link.privacy'), to: '/privacy' },
          { key: 'terms', label: t('landing.footer.link.terms'), to: '/terms' },
          {
            key: 'email',
            label: t('landing.footer.link.contactEmail', { email: SITE_SUPPORT_EMAIL }),
            href: `mailto:${SITE_SUPPORT_EMAIL}`,
          },
        ],
      },
    ],
    [t],
  );

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-logo-col">
            <Link to="/" className="logo-row" style={{ marginBottom: 12 }}>
              <img src="/logo.png" alt={SITE_DISPLAY_NAME} className="logo-img" />
            </Link>
            <p className="footer-tagline">{t('landing.footer.tagline')}</p>
            <div className="footer-divider" aria-hidden />
            <div className="footer-actions" role="list">
              {footerActions.map((action) => (
                <FooterActionButton key={action.key} action={action} />
              ))}
            </div>
          </div>

          {footerColumns.map((column) => (
            <div key={column.heading} className="footer-col">
              <h4>{column.heading}</h4>
              <ul>
                {column.links.map((link) => (
                  <li key={link.key}>
                    <FooterLinkItem link={link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <span className="copyright">
            {t('landing.footer.copyright', {
              year: new Date().getFullYear(),
              siteName: SITE_DISPLAY_NAME,
            })}
          </span>
        </div>
      </div>
    </footer>
  );
}
