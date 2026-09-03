import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { readAuthFromState, resolvePostAuthPath } from '@/lib/auth-redirect';

export function ProtectedRoute() {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    const to = location.pathname === '/' ? '/welcome' : '/login';
    return <Navigate to={to} state={{ from: location }} replace />;
  }

  if (user && !user.onboarding_completed && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (user?.onboarding_completed && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    const target = resolvePostAuthPath(
      readAuthFromState(location.state),
      Boolean(user?.onboarding_completed),
    );
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}
