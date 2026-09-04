import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { AuthSheet } from '@/components/auth/AuthSheet';
import { BrandMark } from '@/components/brand/BrandMark';
import { LoginSheet } from '@/components/auth/LoginSheet';
import { RegisterSheet } from '@/components/auth/RegisterSheet';
import { TermsModal } from '@/components/legal/TermsModal';
import { hasSeenWelcomeAnimation, markWelcomeAnimationSeen } from '@/lib/welcome-storage';
import { selectionHaptic } from '@/lib/platform/native-runtime';
import { WelcomeInstallPrompt } from '@/components/auth/WelcomeInstallPrompt';

type AuthMode = 'welcome' | 'login' | 'register';

function modeFromPath(pathname: string): AuthMode {
  if (pathname.startsWith('/login')) return 'login';
  if (pathname.startsWith('/register')) return 'register';
  return 'welcome';
}

export function AuthScene() {
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const mode = modeFromPath(location.pathname);
  const [legalOpen, setLegalOpen] = useState(false);
  const playFull = !reduceMotion && !hasSeenWelcomeAnimation();
  const [ctaReady, setCtaReady] = useState(() => !playFull);

  useEffect(() => {
    if (reduceMotion) {
      setCtaReady(true);
      markWelcomeAnimationSeen();
      return;
    }
    const appearAt = playFull ? 280 : 80;
    const appear = window.setTimeout(() => setCtaReady(true), appearAt);
    const settle = window.setTimeout(() => markWelcomeAnimationSeen(), appearAt + 400);
    return () => {
      window.clearTimeout(appear);
      window.clearTimeout(settle);
    };
  }, [playFull, reduceMotion]);

  const go = (path: string) => {
    navigate(path, { state: location.state });
  };

  const closeSheet = () => {
    navigate('/welcome', { replace: true, state: location.state });
  };

  const openRegister = () => {
    void selectionHaptic();
    go('/register');
  };

  return (
    <main className="auth-welcome">
      <div className="auth-welcome__ambient" aria-hidden>
        <span className="auth-welcome__blob auth-welcome__blob--a" />
        <span className="auth-welcome__blob auth-welcome__blob--b" />
        <span className="auth-welcome__glow" />
        <span className="auth-welcome__orb auth-welcome__orb--1" />
        <span className="auth-welcome__orb auth-welcome__orb--2" />
        <span className="auth-welcome__orb auth-welcome__orb--3" />
      </div>

      <div className="auth-welcome__main" inert={mode !== 'welcome' ? true : undefined}>
        <div className="auth-welcome__stage">
          <motion.div
            className="auth-welcome__mark"
            initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <BrandMark size={168} alt="Evolyn" variant="full" className="auth-welcome__logo" />
          </motion.div>
          <motion.div
            className="auth-welcome__copy"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0.16 : 0.45,
              delay: reduceMotion ? 0 : 0.12,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <p className="auth-welcome__brand">Evolyn</p>
            <h1 className="auth-welcome__title">Plantando a sua evolução.</h1>
            <p className="auth-welcome__lead">Pequenos passos que crescem com você.</p>
          </motion.div>
        </div>

        <motion.div
          className="auth-welcome__dock"
          initial={false}
          animate={ctaReady ? { opacity: 1, y: 0 } : { opacity: 0, y: reduceMotion ? 0 : 16 }}
          transition={{ duration: reduceMotion ? 0.14 : 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <WelcomeInstallPrompt visible={mode === 'welcome' && ctaReady} />
          <button type="button" className="auth-welcome__cta" onClick={openRegister}>
            Começar agora
          </button>
          <button type="button" className="auth-welcome__secondary" onClick={() => go('/login')}>
            Já tenho uma conta
          </button>
          <nav className="auth-welcome__legal" aria-label="Informações legais">
            <button type="button" onClick={() => setLegalOpen(true)}>
              Termos
            </button>
            <span aria-hidden>·</span>
            <button type="button" onClick={() => setLegalOpen(true)}>
              Privacidade
            </button>
          </nav>
        </motion.div>
      </div>

      <AuthSheet
        open={mode !== 'welcome'}
        titleId={mode === 'register' ? 'auth-register-title' : 'auth-login-title'}
        onClose={closeSheet}
      >
        {mode === 'register' ? (
          <RegisterSheet onGoLogin={() => go('/login')} />
        ) : (
          <LoginSheet onGoRegister={() => go('/register')} />
        )}
      </AuthSheet>
      <TermsModal open={legalOpen} onClose={() => setLegalOpen(false)} />
    </main>
  );
}
