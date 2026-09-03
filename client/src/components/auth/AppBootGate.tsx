import { useEffect, useState, type ReactNode } from 'react';
import { AppBootScreen } from '@/components/auth/AppBootScreen';
import { useAuth } from '@/hooks/useAuth';
import { useBootReadiness } from '@/context/boot-readiness';
import { hideNativeSplash } from '@/lib/platform/native-runtime';

type BootPhase = 'boot' | 'exit' | 'done';

void import('@/pages/DashboardPage');
void import('@/pages/AuthScenePage');

/** Cobre sessão + dados críticos da Home com uma única camada visual. */
export function AppBootGate({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated } = useAuth();
  const { dataReady, resetDataReady } = useBootReadiness();
  const blocking = loading || (isAuthenticated && !dataReady);
  const [phase, setPhase] = useState<BootPhase>(blocking ? 'boot' : 'done');

  useEffect(() => {
    if (!isAuthenticated) resetDataReady();
  }, [isAuthenticated, resetDataReady]);

  useEffect(() => {
    document.documentElement.classList.toggle('evolyn-boot-active', phase !== 'done');
    if (phase === 'done') document.documentElement.classList.add('evolyn-booted');
    return () => {
      document.documentElement.classList.remove('evolyn-boot-active');
    };
  }, [phase]);

  useEffect(() => {
    if (blocking) {
      setPhase('boot');
      return;
    }

    void hideNativeSplash();
    setPhase('exit');
    const timer = window.setTimeout(() => setPhase('done'), 220);
    return () => window.clearTimeout(timer);
  }, [blocking]);

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
