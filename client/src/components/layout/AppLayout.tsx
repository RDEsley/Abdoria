import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Dumbbell, Home, Layers, Settings, Trophy, User, X } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';
import { AfkFab } from '@/components/afk/AfkFab';
import { GameAlertBanner } from '@/components/ui/GameToast';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { GameHud } from '@/components/layout/GameHud';
import { ONBOARDING_TUTORIAL_SLIDES } from '@/components/tutorial/onboarding-tutorial-slides';
import { TutorialOverlay, type TutorialSlide } from '@/components/tutorial/TutorialOverlay';
import { useApp } from '@/hooks/useApp';
import { useCopy } from '@/hooks/useCopy';
import { useAuth } from '@/context/AuthContext';
import { useMobileViewport } from '@/hooks/useMobileViewport';
import { MidnightRefreshProvider, useMidnightRefresh } from '@/context/MidnightRefreshContext';
import { useAfkBackgroundSync } from '@/hooks/useAfkBackgroundSync';
import { markTutorialSeen, shouldShowFirstTimeTutorial } from '@/lib/tutorial';

// Ícone da Home padronizado com os demais itens de navegação (linha simples,
// mesmo peso visual — Castle destoava, era mais ilustrativo que os outros).
// Rótulos variam por preferencias.tom_texto (Linguagem de Jogo x Normal) —
// ver shared/copy.ts.
function buildNavItems(copy: ReturnType<typeof useCopy>) {
  return [
    { to: '/', icon: Home, label: 'Início' },
    { to: '/biblioteca', icon: Layers, label: copy('nav_biblioteca') },
    { to: '/construtor', icon: Dumbbell, label: copy('nav_construtor') },
    { to: '/ranking', icon: Trophy, label: copy('nav_ranking') },
    { to: '/perfil', icon: User, label: copy('nav_perfil') },
  ] as const;
}

const VIEWPORT_NOTICE_KEY = 'abdoria_viewport_notice_dismissed';

function MidnightRefreshListener() {
  const { refreshUser } = useAuth();
  const { refresh: refreshApp } = useApp();

  const handleRefresh = useCallback(() => {
    void refreshApp();
    void refreshUser();
  }, [refreshApp, refreshUser]);

  useMidnightRefresh(handleRefresh);
  return null;
}

export function AppLayout() {
  const { user, refreshUser } = useAuth();
  const copy = useCopy();
  const navItems = buildNavItems(copy);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMobileViewport();
  const [viewportNoticeDismissed, setViewportNoticeDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(VIEWPORT_NOTICE_KEY) === '1';
  });
  const [showTutorial, setShowTutorial] = useState(() => shouldShowFirstTimeTutorial(user));
  const [tutorialSpotlight, setTutorialSpotlight] = useState<TutorialSlide['spotlight'] | null>(
    null,
  );

  useAfkBackgroundSync(Boolean(user));

  useEffect(() => {
    setShowTutorial(shouldShowFirstTimeTutorial(user));
  }, [user]);

  useEffect(() => {
    const state = location.state as { showTutorial?: boolean } | null;
    if (!state?.showTutorial) return;

    setShowTutorial(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const handleTutorialClose = () => {
    setShowTutorial(false);
    if (user && !user.preferencias?.tutorial_visto) {
      void markTutorialSeen(user).then(() => refreshUser());
    }
  };

  const isHomePage = location.pathname === '/';
  const showViewportNotice = !isMobile && !viewportNoticeDismissed;

  const dismissViewportNotice = () => {
    sessionStorage.setItem(VIEWPORT_NOTICE_KEY, '1');
    setViewportNoticeDismissed(true);
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
              <p className="game-sidebar__tag">Abdoria</p>
              <h1 className="game-sidebar__title">Core Quest</h1>
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
                <Icon size={18} strokeWidth={2.5} />
                {label}
              </NavLink>
            ))}
            <NavLink to="/configuracoes" className="game-nav-item mt-3">
              <Settings size={18} strokeWidth={2.5} /> Opções
            </NavLink>
          </nav>

          <div className="game-sidebar__grass" aria-hidden />
        </aside>

        <div className="relative flex min-h-screen flex-1 flex-col md:ml-64">
          <GameHud />

          <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-[calc(var(--top-navbar-height)+0.75rem)] pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:max-w-3xl md:pb-8 md:pt-[calc(var(--top-navbar-height)+1rem)]">
            {showViewportNotice && (
              // Precisa viver DENTRO do <main>: a TopNavbar é `position: fixed`
              // (não ocupa espaço no fluxo) e só o <main> compensa a altura dela
              // via padding-top. Como irmão do <main> (fora dele), o aviso nascia
              // colado no topo do container e ficava coberto pela navbar fixa —
              // o bug reportado de "aviso atrás da top-navbar".
              <div className="relative mb-4">
                <GameAlertBanner
                  variant="info"
                  title="Melhor experiência no celular"
                  message="O Abdoria foi desenhado para telas de celular. Em computador ou tablet, alguns elementos podem não se encaixar perfeitamente."
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-stone-500 shadow-sm transition hover:bg-stone-100 hover:text-stone-700"
                  onClick={dismissViewportNotice}
                  aria-label="Fechar aviso de compatibilidade de tela"
                  title="Fechar aviso"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
            )}
            <Outlet />
          </main>

          <nav className="game-bottom-nav md:hidden" aria-label="Navegação principal">
            <div className="game-bottom-nav__inner">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `game-bottom-nav__item${isActive ? ' game-bottom-nav__item--active' : ''}`
                  }
                >
                  <Icon size={20} strokeWidth={2.5} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
            <div className="game-bottom-nav__grass" aria-hidden />
          </nav>
        </div>

        <TutorialOverlay
          open={showTutorial}
          onClose={handleTutorialClose}
          slides={ONBOARDING_TUTORIAL_SLIDES}
          onSpotlightChange={setTutorialSpotlight}
        />

        {isHomePage && <AfkFab tutorialHighlight={tutorialSpotlight === 'rpg-fab'} />}
      </div>
    </MidnightRefreshProvider>
  );
}
