import { Link } from 'react-router-dom';
import { useMemo } from 'react';
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
  const { t } = useLocale();

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
            key: 'phone',
            label: t('landing.footer.link.contactPhone', { phone: SITE_SUPPORT_PHONE_LABEL }),
            href: `tel:${SITE_SUPPORT_PHONE}`,
          },
          {
            key: 'email',
            label: t('landing.footer.link.contactEmail', { email: SITE_SUPPORT_EMAIL }),
            href: `mailto:${SITE_SUPPORT_EMAIL}`,
          },
        ],
      },
      {
        heading: t('landing.footer.col.pricing'),
        links: [
          { key: 'topup', label: t('landing.footer.link.topup'), to: '/pricing' },
          { key: 'plans', label: t('landing.footer.link.plans'), to: '/pricing' },
        ],
      },
      {
        heading: t('landing.footer.col.company'),
        links: [
          {
            key: 'zalo',
            label: t('landing.footer.link.zalo'),
            href: HOME_NOTIF_CONTACT.zaloSupport,
            external: true,
          },
          {
            key: 'fanpage',
            label: t('landing.footer.link.fanpage'),
            href: HOME_NOTIF_CONTACT.facebook,
            external: true,
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
