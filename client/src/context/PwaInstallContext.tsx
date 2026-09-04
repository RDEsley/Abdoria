import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PwaInstallContext, type PwaInstallResult } from '@/context/pwa-install-context';
import { isStandaloneDisplay } from '@/lib/platform/display-mode';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandaloneDisplay);

  useEffect(() => {
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<PwaInstallResult> => {
    if (installed || isStandaloneDisplay()) return 'already-installed';
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null);
        return 'accepted';
      }
      return 'dismissed';
    }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    return isIos ? 'ios-instructions' : 'browser-instructions';
  }, [installPrompt, installed]);

  const value = useMemo(
    () => ({ installed, promptAvailable: Boolean(installPrompt), install }),
    [install, installPrompt, installed],
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}
