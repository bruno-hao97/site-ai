import { Link, NavLink } from 'react-router-dom';
import { Menu, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { getCreditsAi, getDisplayUser, isLoggedIn } from '../../services/authStore';
import { NAV_LINKS } from '../../lib/landingConfig';
import { SITE_DISPLAY_NAME } from '../../services/siteConfig';
import { useLandingAccess } from './LandingAccessContext';

export default function LandingNavbar() {
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
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {NAV_LINKS.map((item) =>
            'href' in item ? (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </a>
            ) : (
              <NavLink
                key={item.label}
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
          {loggedIn && credits != null ? (
            <span className="credits-badge">
              <Zap size={12} />
              {credits.toLocaleString('vi-VN')} credits
            </span>
          ) : null}
          {loggedIn && user?.avatar ? (
            <img src={user.avatar} alt="" className="nav-avatar" style={{ objectFit: 'cover', padding: 0 }} />
          ) : loggedIn ? (
            <span className="nav-avatar">{(user?.name || 'U').charAt(0)}</span>
          ) : null}
          {!loggedIn && (
            <Link to="/login" className="nav-login">
              Đăng nhập
            </Link>
          )}
          <button type="button" className="cta-btn" onClick={requestAccess}>
            {loggedIn ? 'Vào Studio' : 'Truy cập APP'}
          </button>
        </div>
      </div>
      {menuOpen ? (
        <div className="landing-nav-backdrop" onClick={() => setMenuOpen(false)} aria-hidden />
      ) : null}
    </nav>
  );
}
