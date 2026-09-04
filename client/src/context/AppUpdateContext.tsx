import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  hasVisibleReleaseUpdate,
  isBelowMinimumSupported,
  resolveUpdateStrategy,
  type AppReleaseMeta,
  type AppUpdateStrategy,
} from '@shared/app-release';
import { fetchLatestRelease, getRunningRelease } from '@/lib/app-release';
import { isStandaloneDisplay } from '@/lib/platform/display-mode';
import { showGameToast } from '@/lib/game-toast';

const CHECK_INTERVAL_MS = 45 * 60 * 1000;
const DISMISS_TTL_MS = 12 * 60 * 60 * 1000;
const DISMISS_KEY = 'evolyn:update-dismissed';
const RELOAD_GUARD_KEY = 'evolyn:update-reloading';

type CheckSource = 'boot' | 'foreground' | 'interval' | 'manual';

export type ManualCheckResult =
  | { status: 'latest' }
  | { status: 'available'; latest: AppReleaseMeta }
  | { status: 'offline' }
  | { status: 'error' };

interface DismissState {
  version: string;
  at: number;
}

interface AppUpdateValue {
  running: AppReleaseMeta;
  latest: AppReleaseMeta | null;
  updateAvailable: boolean;
  promptVisible: boolean;
  applying: boolean;
  standalone: boolean;
  strategy: AppUpdateStrategy;
  checkForUpdates: () => Promise<ManualCheckResult>;
  applyUpdate: () => Promise<void>;
  dismissUpdate: () => void;
}

const AppUpdateContext = createContext<AppUpdateValue | null>(null);

function readDismiss(): DismissState | null {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DismissState;
    if (!parsed?.version || !parsed.at) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDismiss(version: string) {
  localStorage.setItem(DISMISS_KEY, JSON.stringify({ version, at: Date.now() }));
}

function isDismissActive(version: string): boolean {
  const dismissed = readDismiss();
  if (!dismissed || dismissed.version !== version) return false;
  return Date.now() - dismissed.at < DISMISS_TTL_MS;
}

function isBusyInteraction(): boolean {
  if (typeof document === 'undefined') return false;
  const path = window.location.pathname;
  if (path.startsWith('/player') || path.includes('/rotina/')) return true;
  if (document.querySelector('[aria-modal="true"], .ab-plan-wizard, .personal-notification-form--flat')) {
    return true;
  }
  return false;
}

async function activateWaitingWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration) return false;

  await registration.update().catch(() => undefined);

  const waiting = registration.waiting;
  if (waiting) {
    waiting.postMessage({ type: 'SKIP_WAITING' });
    return true;
  }

  return false;
}

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const running = useMemo(() => getRunningRelease(), []);
  const [latest, setLatest] = useState<AppReleaseMeta | null>(null);
  const [promptVisible, setPromptVisible] = useState(false);
  const [applying, setApplying] = useState(false);
  const [standalone] = useState(() => isStandaloneDisplay());
  const checkingRef = useRef(false);
  const bootedRef = useRef(false);

  const updateAvailable = Boolean(
    latest && hasVisibleReleaseUpdate(running, latest),
  );

  const strategy = resolveUpdateStrategy(running.channel);

  const evaluatePrompt = useCallback((remote: AppReleaseMeta) => {
    if (!hasVisibleReleaseUpdate(running, remote)) {
      setPromptVisible(false);
      return;
    }
    if (isDismissActive(remote.version)) {
      setPromptVisible(false);
      return;
    }
    setPromptVisible(true);
  }, [running]);

  const checkLatest = useCallback(
    async (source: CheckSource): Promise<ManualCheckResult> => {
      if (checkingRef.current) return { status: 'error' };
      checkingRef.current = true;
      try {
        const remote = await fetchLatestRelease();
        setLatest(remote);

        if (isBelowMinimumSupported(running.version, remote.minimum_supported_version)) {
          // Preparado para mandatory futuro — hoje nunca vem preenchido.
          setPromptVisible(true);
          return { status: 'available', latest: remote };
        }

        if (hasVisibleReleaseUpdate(running, remote)) {
          evaluatePrompt(remote);
          return { status: 'available', latest: remote };
        }

        setPromptVisible(false);
        return { status: 'latest' };
      } catch {
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        if (source === 'manual') {
          return offline ? { status: 'offline' } : { status: 'error' };
        }
        return offline ? { status: 'offline' } : { status: 'error' };
      } finally {
        checkingRef.current = false;
      }
    },
    [evaluatePrompt, running],
  );

  const dismissUpdate = useCallback(() => {
    if (latest) writeDismiss(latest.version);
    setPromptVisible(false);
  }, [latest]);

  const applyUpdate = useCallback(async () => {
    if (applying) return;
    if (isBusyInteraction()) {
      showGameToast('Termine a ação atual antes de atualizar. A atualização recarrega o app.', {
        variant: 'info',
      });
      return;
    }

    setApplying(true);
    try {
      if (sessionStorage.getItem(RELOAD_GUARD_KEY) === '1') {
        sessionStorage.removeItem(RELOAD_GUARD_KEY);
      }
      sessionStorage.setItem(RELOAD_GUARD_KEY, '1');

      const hadWaiting = await activateWaitingWorker();
      if (hadWaiting) {
        await new Promise<void>((resolve) => {
          const onControllerChange = () => {
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
            resolve();
          };
          navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
          window.setTimeout(resolve, 1500);
        });
      }

      window.location.reload();
    } catch {
      sessionStorage.removeItem(RELOAD_GUARD_KEY);
      setApplying(false);
      showGameToast('Não foi possível aplicar a atualização agora.', { variant: 'error' });
    }
  }, [applying]);

  const checkForUpdates = useCallback(async () => checkLatest('manual'), [checkLatest]);

  useEffect(() => {
    sessionStorage.removeItem(RELOAD_GUARD_KEY);
  }, []);

  useEffect(() => {
    const onBooted = () => {
      if (bootedRef.current) return;
      bootedRef.current = true;
      void checkLatest('boot');
    };

    if (document.documentElement.classList.contains('evolyn-booted')) {
      onBooted();
    } else {
      const observer = new MutationObserver(() => {
        if (document.documentElement.classList.contains('evolyn-booted')) {
          observer.disconnect();
          window.setTimeout(onBooted, 400);
        }
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      const fallback = window.setTimeout(onBooted, 4000);
      return () => {
        observer.disconnect();
        window.clearTimeout(fallback);
      };
    }
    return undefined;
  }, [checkLatest]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkLatest('foreground');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void checkLatest('interval');
      }
    }, CHECK_INTERVAL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(timer);
    };
  }, [checkLatest]);

  const value = useMemo<AppUpdateValue>(
    () => ({
      running,
      latest,
      updateAvailable,
      promptVisible: promptVisible && updateAvailable,
      applying,
      standalone,
      strategy,
      checkForUpdates,
      applyUpdate,
      dismissUpdate,
    }),
    [
      applying,
      applyUpdate,
      checkForUpdates,
      dismissUpdate,
      latest,
      promptVisible,
      running,
      standalone,
      strategy,
      updateAvailable,
    ],
  );

  return <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>;
}

export function useAppUpdate() {
  const context = useContext(AppUpdateContext);
  if (!context) throw new Error('useAppUpdate must be used inside AppUpdateProvider');
  return context;
}

export function useAppUpdateOptional() {
  return useContext(AppUpdateContext);
}
