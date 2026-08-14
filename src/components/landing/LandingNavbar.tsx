import { Link, NavLink } from 'react-router-dom';
import { Globe, Menu, X, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocale } from '../../i18n';
import { getNavLinks } from '../../lib/landingI18n';
import { getCreditsAi, getDisplayUser, isLoggedIn } from '../../services/authStore';
import { SITE_DISPLAY_NAME } from '../../services/siteConfig';
import { useLandingAccess } from './LandingAccessContext';

export default function LandingNavbar() {
  const { t, locale, toggleLocale } = useLocale();
  const navLinks = useMemo(() => getNavLinks(t), [t]);
  const requestAccess = useLandingAccess();
  const loggedIn = isLoggedIn();
  const credits = loggedIn ? getCreditsAi() : null;
  const user = loggedIn ? getDisplayUser() : null;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="landing-nav">
      <div className="container">
        <Link to="/" className="logo-row" onClick={() => setMenuOpen(false)}>
          <img src="/logo.png" alt={SITE_DISPLAY_NAME} className="logo-img" />
        </Link>

        <button
          type="button"
          className="landing-nav-toggle"
          aria-label={t('landing.nav.menuAria')}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {navLinks.map((item) =>
            'href' in item ? (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ),
          )}
        </div>

        <div className="nav-actions">
          <button
            type="button"
            className="lang-pill landing-lang-pill"
            aria-label={t('header.switchLang')}
            onClick={toggleLocale}
          >
            <Globe size={14} /> {locale === 'vi' ? 'VI' : 'EN'}
          </button>
          {loggedIn && credits != null ? (
            <span className="credits-badge">
              <Zap size={12} />
              {t('landing.nav.creditsBadge', { count: credits.toLocaleString('vi-VN') })}
            </span>
          ) : null}
          {loggedIn && user?.avatar ? (
            <img src={user.avatar} alt="" className="nav-avatar" style={{ objectFit: 'cover', padding: 0 }} />
          ) : loggedIn ? (
            <span className="nav-avatar">{(user?.name || 'U').charAt(0)}</span>
          ) : null}
          {!loggedIn && (
            <Link to="/login" className="nav-login">
              {t('landing.nav.login')}
            </Link>
          )}
          <button type="button" className="cta-btn" onClick={requestAccess}>
            {loggedIn ? t('landing.nav.enterStudio') : t('landing.nav.accessApp')}
          </button>
        </div>
      </div>
      {menuOpen ? (
        <div className="landing-nav-backdrop" onClick={() => setMenuOpen(false)} aria-hidden />
      ) : null}
    </nav>
  );
}
