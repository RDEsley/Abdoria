import { useEffect, useState, type ReactNode } from 'react';
import { AppBootScreen } from '@/components/auth/AppBootScreen';
import { useAuth } from '@/hooks/useAuth';
import { hideNativeSplash } from '@/lib/platform/native-runtime';

type BootPhase = 'boot' | 'exit' | 'done';

/** Cobre a hidratação inicial (sessão/perfil) com a mesma identidade visual da splash. */
export function AppBootGate({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  const [phase, setPhase] = useState<BootPhase>(loading ? 'boot' : 'done');

  useEffect(() => {
    document.documentElement.classList.toggle('evolyn-boot-active', phase !== 'done');
    return () => {
      document.documentElement.classList.remove('evolyn-boot-active');
    };
  }, [phase]);

  useEffect(() => {
    if (loading) {
      setPhase('boot');
      return;
    }

    void hideNativeSplash();
    setPhase('exit');
    const timer = window.setTimeout(() => setPhase('done'), 300);
    return () => window.clearTimeout(timer);
  }, [loading]);

  return (
    <>
      {children}
      {phase !== 'done' && (
        <div
          className={`app-boot-overlay${phase === 'exit' ? ' app-boot-overlay--exit' : ''}`}
          aria-hidden={phase === 'exit'}
        >
          <AppBootScreen />
        </div>
      )}
    </>
  );
}
