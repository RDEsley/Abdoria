import { NavLink, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { PRIMARY_NAV_ITEMS } from '@/lib/primary-nav';
import { playTabSwitch } from '@/lib/sounds';
import { selectionHaptic } from '@/lib/platform/native-runtime';

export function PrimaryBottomNav() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  return (
    <nav className="game-bottom-nav md:hidden" aria-label="Navegação principal">
      <div className="game-bottom-nav__shell">
        <div className="game-bottom-nav__inner">
          {PRIMARY_NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `game-bottom-nav__item${isActive ? ' game-bottom-nav__item--active' : ''}`
              }
              onClick={() => {
                if (location.pathname === to || (to === '/' && location.pathname === '/')) return;
                playTabSwitch();
                void selectionHaptic();
              }}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      className="game-bottom-nav__leaf"
                      layoutId={reduceMotion ? undefined : 'primary-nav-leaf'}
                      transition={{ type: 'spring', stiffness: 440, damping: 30 }}
                      aria-hidden
                    />
                  )}
                  <motion.span
                    key={`${to}-${isActive ? location.pathname : 'idle'}`}
                    className="game-bottom-nav__icon-wrap"
                    initial={reduceMotion || !isActive ? false : { scale: 0.55, y: 8, rotate: -14 }}
                    animate={
                      isActive ? { scale: 1.08, y: -5, rotate: 0 } : { scale: 1, y: 0, rotate: 0 }
                    }
                    whileTap={reduceMotion ? undefined : { scale: 0.88 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 18 }}
                  >
                    <Icon size={21} strokeWidth={isActive ? 2.75 : 2.35} />
                  </motion.span>
                  <span className="game-bottom-nav__label">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
