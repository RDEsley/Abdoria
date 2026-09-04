import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/hooks/useAuth';
import {
  notificationScheduler,
  type NotificationPermissionState,
} from '@/lib/platform/notification-scheduler';
import { ensureWebPushSubscription } from '@/lib/platform/web-push';
import { updateMe } from '@/lib/api';
import { showGameToast } from '@/lib/game-toast';

const ONBOARDING_SKIP_KEY = 'evolyn:notif-onboarding-skipped-at';
const ONBOARDING_SKIP_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
const SESSION_PROMPT_KEY = 'abdoria_notif_prompt_seen';

export type NotificationCapability = NotificationPermissionState | 'opt_out';

interface NotificationPermissionValue {
  permission: NotificationPermissionState;
  capability: NotificationCapability;
  loading: boolean;
  refresh: () => Promise<NotificationPermissionState>;
  requestPermission: () => Promise<NotificationPermissionState>;
  openSettings: () => Promise<void>;
  markOnboardingSkipped: () => void;
  wasOnboardingSkipped: () => boolean;
  canDeliverReminders: boolean;
}

const NotificationPermissionContext = createContext<NotificationPermissionValue | null>(null);

export function NotificationPermissionProvider({ children }: { children: ReactNode }) {
  const { user, applyUser } = useAuth();
  const [permission, setPermission] = useState<NotificationPermissionState>('prompt');
  const [loading, setLoading] = useState(true);
  const optOut = Boolean(user?.preferencias?.notificacoes_opt_out);

  const refresh = useCallback(async () => {
    const next = await notificationScheduler.permissionState();
    setPermission(next);
    setLoading(false);
    return next;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    let removeCap: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      void CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) void refresh();
      }).then((handle) => {
        removeCap = () => {
          void handle.remove();
        };
      });
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      removeCap?.();
    };
  }, [refresh]);

  const requestPermission = useCallback(async () => {
    const next = await notificationScheduler.requestPermission();
    setPermission(next);
    if (next === 'granted') {
      await ensureWebPushSubscription().catch(() => undefined);
      if (optOut && user) {
        try {
          const updated = await updateMe({
            preferencias: { ...user.preferencias, notificacoes_opt_out: false },
          });
          applyUser(updated);
        } catch {
          /* best effort */
        }
      }
    }
    return next;
  }, [applyUser, optOut, user]);

  const openSettings = useCallback(async () => {
    await notificationScheduler.openSystemSettings?.();
    showGameToast('Abra as configurações do sistema para ativar notificações.', {
      variant: 'info',
    });
  }, []);

  const markOnboardingSkipped = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_SKIP_KEY, String(Date.now()));
      sessionStorage.setItem(SESSION_PROMPT_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const wasOnboardingSkipped = useCallback(() => {
    try {
      const raw = localStorage.getItem(ONBOARDING_SKIP_KEY);
      if (!raw) return false;
      // Legado: flag permanente "1" — trata como cooldown a partir de agora.
      if (raw === '1') {
        localStorage.setItem(ONBOARDING_SKIP_KEY, String(Date.now()));
        return true;
      }
      const at = Number(raw);
      if (!Number.isFinite(at)) return false;
      return Date.now() - at < ONBOARDING_SKIP_COOLDOWN_MS;
    } catch {
      return false;
    }
  }, []);

  const capability: NotificationCapability = optOut ? 'opt_out' : permission;
  const canDeliverReminders = permission === 'granted' && !optOut;

  const value = useMemo(
    () => ({
      permission,
      capability,
      loading,
      refresh,
      requestPermission,
      openSettings,
      markOnboardingSkipped,
      wasOnboardingSkipped,
      canDeliverReminders,
    }),
    [
      canDeliverReminders,
      capability,
      loading,
      markOnboardingSkipped,
      openSettings,
      permission,
      refresh,
      requestPermission,
      wasOnboardingSkipped,
    ],
  );

  return (
    <NotificationPermissionContext.Provider value={value}>
      {children}
    </NotificationPermissionContext.Provider>
  );
}

export function useNotificationPermission() {
  const ctx = useContext(NotificationPermissionContext);
  if (!ctx) {
    throw new Error('useNotificationPermission must be used inside NotificationPermissionProvider');
  }
  return ctx;
}

export function useNotificationPermissionOptional() {
  return useContext(NotificationPermissionContext);
}
