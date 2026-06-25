import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import {
  clearAuth,
  getCreditsAi,
  isLoggedIn,
  loadAuth,
  refreshSession,
} from './services/authStore';
import { fetchMe } from './services/backendApi';
import { isBackendLoggedIn, setSessionUser } from './services/session';
import { UpstreamMeError } from './services/upstreamMe';
import { useCreditsUpdated } from './hooks/useCreditsUpdated';
import type { JobType } from './services/api';
import ProtectedRoute from './components/ProtectedRoute';
import UserMenuDropdown from './components/user/UserMenuDropdown';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import ProjectsPage from './pages/ProjectsPage';
import WorkflowPage from './pages/WorkflowPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import StudioPage from './pages/StudioPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import SettingsTokensPage from './pages/SettingsTokensPage';
import UsageHistoryPage from './pages/UsageHistoryPage';
import StudioHistoryPage from './pages/StudioHistoryPage';
import ApiPlaygroundPage from './pages/ApiPlaygroundPage';
import DashboardPage from './pages/DashboardPage';
import WalletPage from './pages/WalletPage';
import ApiKeysPage from './pages/ApiKeysPage';
import AccountLayout from './pages/account/AccountLayout';
import AccountSettingsPage from './pages/account/AccountSettingsPage';
import AccountPromoPage from './pages/account/AccountPromoPage';
import AccountSubscriptionPage from './pages/account/AccountSubscriptionPage';
import AccountTransferPage from './pages/account/AccountTransferPage';
import AccountTransactionsPage from './pages/account/AccountTransactionsPage';

const MAIN_NAV = [
  { to: '/home', label: 'Home' },
  { to: '/explore', label: 'Explore' },
  { to: '/projects', label: 'Dự án' },
  { to: '/image', label: 'Image' },
  { to: '/video', label: 'Video' },
  { to: '/audio', label: 'Audio' },
  { to: '/music', label: 'Music' },
  { to: '/workflow', label: 'Workflow' },
] as const;

const STUDIO_NAV: Record<string, JobType> = {
  '/image': 'image',
  '/video': 'video',
  '/audio': 'tts',
  '/music': 'music',
};

function StudioHistoryRedirect() {
  const { type } = useParams<{ type: string }>();
  return <Navigate to={type ? `/studio-history/${type}` : '/studio-history'} replace />;
}

function AppHeader() {
  const [credits, setCredits] = useState(getCreditsAi());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const loggedIn = isLoggedIn();
  const location = useLocation();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  function refreshCredits() {
    if (loadAuth()) {
      refreshSession()
        .then((s) => setCredits(s.upstream_me.balancesInfo?.credits_ai ?? 0))
        .catch((err) => {
          // Token Gommo hết hạn / bị thu hồi → đăng xuất, về trang login.
          if (err instanceof UpstreamMeError && (err.status === 401 || err.status === 403)) {
            clearAuth();
            window.location.href = '/login';
          }
        });
    } else if (isBackendLoggedIn()) {
      fetchMe()
        .then((d) => setCredits(d.balance))
        .catch(() => {});
    }
  }

  useEffect(() => {
    if (!loggedIn) return;
    refreshCredits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  // Tạo job xong → StudioPage bắn 'credits:updated' → header refresh số dư.
  useCreditsUpdated(() => {
    if (loggedIn) refreshCredits();
  });

  return (
    <header className="app-header">
      <div className="app-header-inner">
        {loggedIn && (
          <button
            type="button"
            className="nav-toggle"
            aria-label="Mở menu"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
        <Link to="/" className="brand">
          <img src="/logo.png" alt="AI Center" className="brand-logo" />
        </Link>
        {loggedIn ? (
          <>
            <nav className={`nav-main ${mobileNavOpen ? 'open' : ''}`}>
              {MAIN_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-main-link ${isActive ? 'active' : ''}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            {mobileNavOpen && (
              <div
                className="nav-backdrop"
                onClick={() => setMobileNavOpen(false)}
                aria-hidden="true"
              />
            )}
            <div className="header-meta">
              <button type="button" className="lang-pill">VI</button>
              <a
                href="https://79ai.net/pricing"
                target="_blank"
                rel="noreferrer"
                className="price-pill"
              >
                Bảng giá
              </a>
              <div className="header-balance">
                <span className="header-balance-label">Số dư</span>
                <span className="credit-pill header-credit-pill">
                  {credits.toLocaleString('vi-VN')}
                </span>
              </div>
              <UserMenuDropdown credits={credits} onCreditsRefresh={refreshCredits} />
            </div>
          </>
        ) : (
          <nav className="nav">
            <Link to="/login">Đăng nhập</Link>
          </nav>
        )}
      </div>
    </header>
  );
}

function AppShell() {
  const location = useLocation();
  const BARE_PAGES = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
  const isBarePage = BARE_PAGES.includes(location.pathname);
  const isWorkflow = location.pathname === '/workflow';
  const isFullBleed = location.pathname in STUDIO_NAV || isWorkflow;
  const hideHeader = isBarePage || isWorkflow;

  return (
    <div className={isBarePage ? '' : 'app'}>
      {!hideHeader && <AppHeader />}
      <main
        className={isBarePage ? '' : `app-main ${isFullBleed ? 'app-main-full' : ''} ${isWorkflow ? 'app-main-workflow' : ''}`}
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={isLoggedIn() ? <Navigate to="/home" /> : <LoginPage />} />
          <Route path="/register" element={isLoggedIn() ? <Navigate to="/home" /> : <RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/workflow" element={<WorkflowPage />} />
            {Object.entries(STUDIO_NAV).map(([path, type]) => (
              <Route
                key={path}
                path={path}
                element={
                  <StudioPage key={path} initialType={type} lockType layout="composer" />
                }
              />
            ))}
            <Route path="/app" element={<StudioPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/playground" element={<ApiPlaygroundPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/tokens" element={<SettingsTokensPage />} />
            <Route path="/usage-history" element={<UsageHistoryPage />} />
            <Route path="/usage-history/:type" element={<UsageHistoryPage />} />
            <Route path="/studio-history" element={<StudioHistoryPage />} />
            <Route path="/studio-history/:type" element={<StudioHistoryPage />} />
            <Route path="/history" element={<Navigate to="/studio-history" replace />} />
            <Route path="/history/:type" element={<StudioHistoryRedirect />} />
            <Route path="/account" element={<AccountLayout />}>
              <Route index element={<AccountSettingsPage />} />
              <Route path="promo" element={<AccountPromoPage />} />
              <Route path="subscription" element={<AccountSubscriptionPage />} />
              <Route path="transfer" element={<AccountTransferPage />} />
              <Route path="transactions" element={<AccountTransactionsPage />} />
            </Route>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route
              path="/api-keys"
              element={loadAuth() ? <Navigate to="/settings/tokens" replace /> : <ApiKeysPage />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    if (isBackendLoggedIn() && !loadAuth()) {
      fetchMe()
        .then((d) => setSessionUser(d.user, d.balance))
        .catch(() => {
          /* 401 trong fetchMe đã tự xử lý đăng xuất ở backendApi */
        });
    }
  }, []);

  return <AppShell />;
}
