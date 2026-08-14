import { Navigate, Outlet, useLocation } from 'react-router-dom';
import StudioPage from './StudioPage';
import { studioTypeFromPath } from '../lib/studioRoutes';

/** Persistent wrapper — keeps StudioPage mounted across /image ↔ /video ↔ /music. */
export default function ComposerShell() {
  const { pathname } = useLocation();
  const type = studioTypeFromPath(pathname);
  if (!type) return <Navigate to="/image" replace />;
  return (
    <>
      <StudioPage lockType />
      <Outlet />
    </>
  );
}
