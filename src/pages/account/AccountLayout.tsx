import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  ArrowLeftRight,
  Crown,
  Gift,
  History,
  Home,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getDisplayUser } from '../../services/authStore';
import { useLocale } from '../../i18n';
import type { TranslationKey } from '../../i18n/types';

interface NavItem {
  to: string;
  end?: boolean;
  icon: LucideIcon;
  labelKey: TranslationKey;
}

interface NavGroup {
  sectionKey: TranslationKey;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    sectionKey: 'account.section.settings',
    items: [
      { to: '/account', end: true, icon: User, labelKey: 'account.nav.account' },
      { to: '/account/promo', icon: Gift, labelKey: 'account.nav.promo' },
    ],
  },
  {
    sectionKey: 'account.section.plan',
    items: [{ to: '/account/subscription', icon: Crown, labelKey: 'account.nav.subscription' }],
  },
  {
    sectionKey: 'account.section.finance',
    items: [
      { to: '/account/transfer', icon: ArrowLeftRight, labelKey: 'account.nav.transfer' },
      { to: '/account/transactions', icon: History, labelKey: 'account.nav.transactions' },
    ],
  },
];

export default function AccountLayout() {
  const { t } = useLocale();
  const user = getDisplayUser();

  return (
    <div className="account-dashboard">
      <div className="account-dashboard-top">
        <Link to="/home" className="account-back-home">
          <Home size={16} />
          {t('account.backHome')}
        </Link>
      </div>
      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="account-sidebar-user">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="account-sidebar-avatar" />
            ) : (
              <span className="account-sidebar-avatar account-sidebar-avatar-fallback" />
            )}
            <div>
              <strong>{user.name || '—'}</strong>
              <span className="account-sidebar-handle">@{user.username || '—'}</span>
            </div>
          </div>

          {NAV.map((group) => (
            <div key={group.sectionKey} className="account-nav-group">
              <p className="account-nav-section">{t(group.sectionKey)}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `account-nav-item${isActive ? ' active' : ''}`
                    }
                  >
                    <span className="account-nav-icon" aria-hidden>
                      <Icon size={16} strokeWidth={1.75} />
                    </span>
                    {t(item.labelKey)}
                  </NavLink>
                );
              })}
            </div>
          ))}

          <div className="account-community-box">
            <strong>{t('account.community.title')}</strong>
            <p>{t('account.community.desc')}</p>
            <a
              href="https://discord.gg/"
              target="_blank"
              rel="noreferrer"
              className="account-community-btn"
            >
              {t('account.community.join')}
            </a>
          </div>
        </aside>

        <div className="account-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
