import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import {
  getCreditsAi,
  isLoggedIn,
  refreshSession,
} from './services/authStore';
import ProtectedRoute from './components/ProtectedRoute';
import UserMenuDropdown from './components/user/UserMenuDropdown';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import StudioPage from './pages/StudioPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import SettingsTokensPage from './pages/SettingsTokensPage';
import UsageHistoryPage from './pages/UsageHistoryPage';
import StudioHistoryPage from './pages/StudioHistoryPage';
import ApiPlaygroundPage from './pages/ApiPlaygroundPage';
import AccountLayout from './pages/account/AccountLayout';
import AccountSettingsPage from './pages/account/AccountSettingsPage';
import AccountPromoPage from './pages/account/AccountPromoPage';
import AccountSubscriptionPage from './pages/account/AccountSubscriptionPage';
import AccountTransferPage from './pages/account/AccountTransferPage';
import AccountTransactionsPage from './pages/account/AccountTransactionsPage';

function StudioHistoryRedirect() {
  const { type } = useParams<{ type: string }>();
  return <Navigate to={type ? `/studio-history/${type}` : '/studio-history'} replace />;
}

function AppHeader() {
  const [credits, setCredits] = useState(getCreditsAi());
  const loggedIn = isLoggedIn();

  useEffect(() => {
    if (!loggedIn) return;
    refreshSession()
      .then((s) => setCredits(s.upstream_me.balancesInfo?.credits_ai ?? 0))
      .catch(() => {});
  }, [loggedIn]);

  function refreshCredits() {
    refreshSession()
      .then((s) => setCredits(s.upstream_me.balancesInfo?.credits_ai ?? 0))
      .catch(() => {});
  }

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link to="/" className="brand">79 AI</Link>
        {loggedIn ? (
          <>
            <nav className="nav nav-compact">
              <Link to="/app">Studio</Link>
              <Link to="/playground">Playground</Link>
            </nav>
            <div className="header-meta">
              <span className="header-balance-label">Số dư</span>
              <span className="credit-pill header-credit-pill">
                {credits.toLocaleString('vi-VN')}
              </span>
              <a
                href="https://79ai.net/pricing"
                target="_blank"
                rel="noreferrer"
                className="btn header-upgrade-btn sm"
              >
                Nâng cấp
              </a>
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
  const isBarePage = location.pathname === '/' || location.pathname === '/login';

  return (
    <div className={isBarePage ? '' : 'app'}>
      {!isBarePage && <AppHeader />}
      <main className={isBarePage ? '' : 'app-main'}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={isLoggedIn() ? <Navigate to="/app" /> : <LoginPage />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
          <Route path="/reset-password" element={<Navigate to="/login" replace />} />
          <Route element={<ProtectedRoute />}>
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
            <Route path="/dashboard" element={<Navigate to="/profile" replace />} />
            <Route path="/wallet" element={<Navigate to="/usage-history" replace />} />
            <Route path="/api-keys" element={<Navigate to="/settings/tokens" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return <AppShell />;
}
