import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Dumbbell, Home, Layers, Settings, Trophy, User } from 'lucide-react';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { GameHud } from '@/components/layout/GameHud';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import { useAuth } from '@/context/AuthContext';
import { markTutorialSeen, shouldShowFirstTimeTutorial } from '@/lib/tutorial';

const navItems = [
  { to: '/', icon: Home, label: 'Base' },
  { to: '/biblioteca', icon: Layers, label: 'Itens' },
  { to: '/construtor', icon: Dumbbell, label: 'Missão' },
  { to: '/ranking', icon: Trophy, label: 'Arena' },
  { to: '/perfil', icon: User, label: 'Herói' },
];

export function AppLayout() {
  const { user, refreshUser } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (shouldShowFirstTimeTutorial(user)) {
      setShowTutorial(true);
    }
  }, [user]);

  const handleTutorialClose = () => {
    setShowTutorial(false);
    if (user && !user.preferencias?.tutorial_visto) {
      void markTutorialSeen(user).then(() => refreshUser());
    }
  };

  return (
    <div className="game-app relative flex min-h-screen flex-col md:flex-row text-stone-800">
      <AnimatedBackground variant="app" />

      <aside className="game-sidebar hidden w-64 shrink-0 flex-col md:flex">
        <div className="game-sidebar__brand">
          <img src="/brand/logo.png" alt="" className="game-sidebar__logo" width={48} height={48} />
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
              className={({ isActive }) => `game-nav-item${isActive ? ' game-nav-item--active' : ''}`}
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

      <div className="relative flex min-h-screen flex-1 flex-col">
        <div className="game-hud-shell px-4 pt-4 md:px-8 md:pt-6">
          <GameHud />
        </div>

        <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:max-w-3xl md:pb-8">
          <Outlet />
        </main>

        <nav className="game-bottom-nav md:hidden" aria-label="Navegação principal">
          <div className="game-bottom-nav__inner">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `game-bottom-nav__item${isActive ? ' game-bottom-nav__item--active' : ''}`}
              >
                <Icon size={20} strokeWidth={2.5} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
          <div className="game-bottom-nav__grass" aria-hidden />
        </nav>
      </div>

      <TutorialOverlay open={showTutorial} onClose={handleTutorialClose} />
    </div>
  );
}
