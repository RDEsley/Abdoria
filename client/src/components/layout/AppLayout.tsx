import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { BrandMark } from '@/components/brand/BrandMark';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { GameHud } from '@/components/layout/GameHud';
import { ONBOARDING_TUTORIAL_SLIDES } from '@/components/tutorial/onboarding-tutorial-slides';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/hooks/useAuth';
import { MidnightRefreshProvider, useMidnightRefresh } from '@/context/MidnightRefreshContext';
import { markTutorialSeen, shouldShowFirstTimeTutorial } from '@/lib/tutorial';
import { usePersonalizedReminders } from '@/hooks/usePersonalizedReminders';
import { usePrimaryNavSwipe } from '@/hooks/usePrimaryNavSwipe';
import { ResumeWorkoutPrompt } from '@/components/player/ResumeWorkoutPrompt';
import { PageEntranceProvider } from '@/context/PageEntranceContext';
import { PRIMARY_NAV_ITEMS } from '@/lib/primary-nav';
import { PrimaryBottomNav } from '@/components/layout/PrimaryBottomNav';

function MidnightRefreshListener() {
  const { refresh: refreshApp } = useApp();

  const handleRefresh = useCallback(() => {
    void refreshApp();
  }, [refreshApp]);

  useMidnightRefresh(handleRefresh);
  return null;
}

export function AppLayout() {
  const { user, refreshUser } = useAuth();
  const navItems = PRIMARY_NAV_ITEMS;
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { setSwipeNode, enterFrom } = usePrimaryNavSwipe();
  const [pageEntrance, setPageEntrance] = useState({ pathname: '', ready: false });
  const [showTutorial, setShowTutorial] = useState(() => shouldShowFirstTimeTutorial(user));
  usePersonalizedReminders();

  useEffect(() => {
    setShowTutorial(shouldShowFirstTimeTutorial(user));
  }, [user]);

  useEffect(() => {
    const state = location.state as { showTutorial?: boolean } | null;
    if (!state?.showTutorial) return;

    setShowTutorial(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    setPageEntrance({ pathname: location.pathname, ready: Boolean(reduceMotion) });
    if (reduceMotion) return undefined;

    // A rota entra primeiro; os indicadores internos recebem o sinal logo
    // depois do stagger dos cards principais. Assim barras, checks e números
    // não terminam enquanto seu próprio card ainda está aparecendo.
    const timer = window.setTimeout(() => {
      setPageEntrance({ pathname: location.pathname, ready: true });
    }, 620);
    return () => window.clearTimeout(timer);
  }, [location.pathname, reduceMotion]);

  const handleTutorialClose = () => {
    setShowTutorial(false);
    if (user && !user.preferencias?.tutorial_visto) {
      void markTutorialSeen(user).then(() => refreshUser());
    }
  };

  return (
    <MidnightRefreshProvider>
      <MidnightRefreshListener />
      <div className="game-app relative flex min-h-screen flex-col md:flex-row text-stone-800">
        <AnimatedBackground variant="app" />

        <aside className="game-sidebar hidden w-64 shrink-0 flex-col md:flex">
          <div className="game-sidebar__brand">
            <BrandMark size={48} alt="" className="game-sidebar__logo" />
            <div>
              <p className="game-sidebar__tag">Evolyn</p>
              <h1 className="game-sidebar__title">Plantando a sua evolução.</h1>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Navegação lateral">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `game-nav-item${isActive ? ' game-nav-item--active' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        className="game-nav-item__blob"
                        layoutId={reduceMotion ? undefined : 'sidebar-nav-blob'}
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                        aria-hidden
                      />
                    )}
                    <motion.span
                      key={`${to}-${isActive ? location.pathname : 'idle'}`}
                      className="relative z-[1]"
                      initial={reduceMotion || !isActive ? false : { scale: 0.7, rotate: -12 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 16 }}
                    >
                      <Icon size={18} strokeWidth={2.5} />
                    </motion.span>
                    <span className="relative z-[1]">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
            <div className="game-nav-item__divider" role="presentation" />
            <NavLink to="/configuracoes" className="game-nav-item game-nav-item--system">
              <Settings size={17} strokeWidth={2.5} /> Opções
            </NavLink>
          </nav>

          <div className="game-sidebar__grass" aria-hidden />
        </aside>

        <div className="relative flex min-h-screen flex-1 flex-col md:ml-64">
          <GameHud />

          <main
            ref={setSwipeNode}
            className="mx-auto w-full max-w-lg flex-1 px-4 pt-[calc(var(--top-navbar-height)+0.75rem)] pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:max-w-3xl md:pb-8 md:pt-[calc(var(--top-navbar-height)+1rem)]"
          >
            <motion.div
              key={location.pathname}
              className="game-page-transition"
              initial={
                reduceMotion
                  ? false
                  : enterFrom
                    ? { opacity: 0.4, x: enterFrom * 56 }
                    : { opacity: 0, y: 10 }
              }
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <PageEntranceProvider
                ready={pageEntrance.pathname === location.pathname && pageEntrance.ready}
              >
                <Outlet />
              </PageEntranceProvider>
            </motion.div>
          </main>

          <PrimaryBottomNav />
        </div>

        <TutorialOverlay
          open={showTutorial}
          onClose={handleTutorialClose}
          slides={ONBOARDING_TUTORIAL_SLIDES}
          dismissible={Boolean(user?.preferencias?.tutorial_visto)}
        />
        {!showTutorial && <ResumeWorkoutPrompt />}
      </div>
    </MidnightRefreshProvider>
  );
}
