import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { useAuth } from '@/context/AuthContext';

function LoadingScreen() {
  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <AnimatedBackground variant="app" />
      <p className="relative font-bold text-stone-600">Carregando...</p>
    </div>
  );
}

export function ProtectedRoute() {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
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

  if (loading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    if (user && !user.onboarding_completed) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
