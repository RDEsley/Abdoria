import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { LoadingMascot } from '@/components/ui/LoadingMascot';
import { useAuth } from '@/context/AuthContext';

function LoadingScreen() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <AnimatedBackground variant="app" />
      <motion.div
        className="relative z-10 flex w-full max-w-sm flex-col items-center gap-4 rounded-[2rem] border border-white/70 bg-white/75 p-6 text-center shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-sm"
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        <LoadingMascot className="h-28 w-28" />
        <div>
          <p className="text-base font-extrabold text-stone-800">Carregando sua jornada...</p>
          <p className="mt-1 text-sm font-medium text-stone-500">Buscando sessão e progresso.</p>
        </div>
      </motion.div>
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
