import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../services/authStore';
import { loginPathWithNext } from '../lib/landingConfig';

export default function ProtectedRoute() {
  const location = useLocation();

  if (!isLoggedIn()) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={loginPathWithNext(next)} replace />;
  }

  return <Outlet />;
}
