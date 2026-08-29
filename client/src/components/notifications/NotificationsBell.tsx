import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Coins,
  Dumbbell,
  Flame,
  Medal,
  Snowflake,
  Sparkles,
  TimerReset,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ReminderCenter } from '@/components/activities/ReminderCenter';
import { showGameToast } from '@/components/ui/GameToast';
import { useMidnightSecondsLeft } from '@/context/MidnightRefreshContext';
import { getErrorMessage } from '@/lib/api-errors';
import { useApp } from '@/hooks/useApp';
import { buildLocalNotices, dismissLocalNotice, isLocalNotice } from '@/lib/local-notifications';
import {
  clearAllNotifications,
  dismissNotification,
  getNotifications,
  markAllNotificationsRead,
  type AppNotification,
} from '@/lib/api/notifications';

function iconForTipo(tipo: string) {
  if (tipo === 'ranking_podio') return <Medal size={16} aria-hidden />;
  if (tipo === 'ranking_premio') return <Coins size={16} aria-hidden />;
  if (tipo === 'streak_frozen' || tipo === 'frozen_baixo')
    return <Snowflake size={16} aria-hidden />;
  if (tipo === 'streak_reset') return <TimerReset size={16} aria-hidden />;
  if (tipo === 'streak_recovery_available') return <Flame size={16} aria-hidden />;
  if (tipo === 'lembrete_treino') return <Dumbbell size={16} aria-hidden />;
  if (tipo === 'novo_seguidor') return <UserPlus size={16} aria-hidden />;
  return <Sparkles size={16} aria-hidden />;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 1) return 'agora há pouco';
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `há ${diffD}d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/** Sino da navbar: badge de não lidas + painel com as notificações persistentes. */
export function NotificationsBell() {
  const { stats, user } = useApp();
  const secondsLeft = useMidnightSecondsLeft();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [localDismissTick, setLocalDismissTick] = useState(0);
  const [tab, setTab] = useState<'inbox' | 'scheduled'>('inbox');

  const frozenAutoUse = user?.preferencias?.frozen_streak_auto_usar ?? true;
  const localNotices = useMemo(
    () => buildLocalNotices(stats, { frozenAutoUse, secondsLeft }),
    // O contador invalida o texto; a revisão invalida dispensas salvas no localStorage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [frozenAutoUse, localDismissTick, secondsLeft, stats],
  );
  const allItems = useMemo(() => [...localNotices, ...items], [localNotices, items]);
  const urgentLocalCount = localNotices.filter((notice) => notice.lida_em === null).length;

  const handleDismiss = async (id: string) => {
    if (isLocalNotice(id)) {
      dismissLocalNotice(id);
      setLocalDismissTick((tick) => tick + 1);
      return;
    }
    setBusyId(id);
    try {
      await dismissNotification(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível remover.'), { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const handleClearAll = async () => {
    setBusyId('all');
    try {
      for (const notice of localNotices) dismissLocalNotice(notice.id);
      setLocalDismissTick((tick) => tick + 1);
      await clearAllNotifications();
      setItems([]);
      setUnread(0);
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível limpar.'), { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const refresh = useCallback(async () => {
    try {
      const data = await getNotifications();
      setItems(data.items);
      setUnread(data.unread_count);
    } catch {
      /* silencioso: sino não pode quebrar a navbar */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const data = await getNotifications();
      setItems(data.items);
      setUnread(data.unread_count);
      if (data.unread_count > 0) {
        await markAllNotificationsRead();
        const readAt = new Date().toISOString();
        setItems((previous) =>
          previous.map((item) => (item.lida_em ? item : { ...item, lida_em: readAt })),
        );
        setUnread(0);
      }
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível carregar as notificações.'), {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="notifications-bell"
        onClick={() => void handleOpen()}
        aria-label={
          unread + urgentLocalCount > 0
            ? `Notificações — ${unread + urgentLocalCount} não lidas`
            : 'Notificações'
        }
      >
        <Bell size={20} strokeWidth={2.2} aria-hidden />
        {unread + urgentLocalCount > 0 && (
          <span className="notifications-bell__badge tabular-nums" aria-hidden>
            {unread + urgentLocalCount > 99 ? '99+' : unread + urgentLocalCount}
          </span>
        )}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        variant="wide"
        labelledBy="notifications-title"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id="notifications-title" className="text-base font-extrabold text-stone-800">
            Notificações
          </h2>
          {allItems.length > 0 && (
            <button
              type="button"
              className="notifications-clear"
              disabled={busyId === 'all'}
              onClick={() => void handleClearAll()}
            >
              <Trash2 size={13} aria-hidden />
              Limpar tudo
            </button>
          )}
        </div>
        <div className="notifications-tabs" role="tablist" aria-label="Seções de notificações">
          <button
            type="button"
            id="notifications-tab-inbox"
            role="tab"
            aria-selected={tab === 'inbox'}
            aria-controls="notifications-panel-inbox"
            onClick={() => setTab('inbox')}
          >
            Caixa de entrada
          </button>
          <button
            type="button"
            id="notifications-tab-scheduled"
            role="tab"
            aria-selected={tab === 'scheduled'}
            aria-controls="notifications-panel-scheduled"
            onClick={() => setTab('scheduled')}
          >
            Programadas
          </button>
        </div>
        <div
          id={tab === 'scheduled' ? 'notifications-panel-scheduled' : 'notifications-panel-inbox'}
          role="tabpanel"
          aria-labelledby={
            tab === 'scheduled' ? 'notifications-tab-scheduled' : 'notifications-tab-inbox'
          }
        >
          {tab === 'scheduled' ? (
            <ReminderCenter />
          ) : loading ? (
            <p className="mt-3 text-sm font-bold text-stone-500">Carregando...</p>
          ) : allItems.length === 0 ? (
            <p className="mt-3 text-sm font-bold text-stone-500">
              Nada por aqui ainda. Feche a semana no ranking pra começar a receber novidades.
            </p>
          ) : (
            <ul className="mt-3 flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
              {allItems.map((item) => (
                <li
                  key={item.id}
                  className={`notifications-item${item.lida_em ? '' : ' notifications-item--unread'}`}
                >
                  <span className="notifications-item__icon">{iconForTipo(item.tipo)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="notifications-item__title">{item.titulo}</p>
                    {item.corpo && <p className="notifications-item__body">{item.corpo}</p>}
                    <p className="notifications-item__when">{formatWhen(item.criada_em)}</p>
                  </div>
                  <button
                    type="button"
                    className="notifications-item__dismiss"
                    aria-label="Remover notificação"
                    title="Remover"
                    disabled={busyId === item.id}
                    onClick={() => void handleDismiss(item.id)}
                  >
                    <X size={14} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </>
  );
}
