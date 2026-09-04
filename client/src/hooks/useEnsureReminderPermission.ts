import { useCallback } from 'react';
import { useNotificationPermissionOptional } from '@/context/NotificationPermissionContext';
import { notificationScheduler } from '@/lib/platform/notification-scheduler';
import { showGameToast } from '@/lib/game-toast';

/**
 * Gate para ativar lembretes: só marca enabled quando a capacidade
 * real de notificação permite entrega.
 */
export function useEnsureReminderPermission() {
  const notif = useNotificationPermissionOptional();

  const permission = notif?.permission ?? 'prompt';
  const canDeliverReminders = notif?.canDeliverReminders ?? false;
  const capability = notif?.capability ?? permission;

  const ensureCanEnableReminder = useCallback(async (): Promise<boolean> => {
    const current = notif ? await notif.refresh() : await notificationScheduler.permissionState();
    const optOut = notif?.capability === 'opt_out';

    if (optOut) {
      showGameToast('Ative as notificações nas Configurações para receber este aviso.', {
        variant: 'info',
      });
      return false;
    }

    if (current === 'granted') return true;

    if (current === 'unsupported') {
      showGameToast('Este dispositivo não suporta notificações.', { variant: 'info' });
      return false;
    }

    if (current === 'denied') {
      showGameToast('Ative as notificações nas configurações do dispositivo.', {
        variant: 'info',
      });
      return false;
    }

    // prompt — explicar e só então pedir ao SO
    showGameToast('Precisamos da sua permissão para avisar na hora certa.', {
      variant: 'info',
    });
    const next = notif
      ? await notif.requestPermission()
      : await notificationScheduler.requestPermission();
    if (next === 'granted') return true;

    if (next === 'denied') {
      showGameToast('Ative as notificações para receber este aviso.', { variant: 'info' });
    }
    return false;
  }, [notif]);

  return {
    permission,
    capability,
    canDeliverReminders,
    ensureCanEnableReminder,
    openSettings: notif?.openSettings,
  };
}

export function reminderPermissionHint(
  permission: string,
  canDeliver: boolean,
): string | null {
  if (canDeliver) return null;
  if (permission === 'unsupported') {
    return 'Notificações não estão disponíveis neste dispositivo.';
  }
  if (permission === 'denied') {
    return 'Ative as notificações para receber este aviso.';
  }
  if (permission === 'opt_out') {
    return 'Notificações estão desativadas nas Configurações.';
  }
  return 'Ative as notificações para receber este aviso.';
}
