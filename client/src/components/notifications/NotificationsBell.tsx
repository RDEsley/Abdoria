import { useCallback, useEffect, useState } from 'react';
import { Bell, Coins, Medal, Snowflake, Sparkles, Trash2, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
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
  if (tipo === 'streak_frozen') return <Snowflake size={16} aria-hidden />;
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
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleDismiss = async (id: string) => {
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
        aria-label={unread > 0 ? `Notificações — ${unread} não lidas` : 'Notificações'}
      >
        <Bell size={20} strokeWidth={2.2} aria-hidden />
        {unread > 0 && (
          <span className="notifications-bell__badge tabular-nums" aria-hidden>
            {unread > 99 ? '99+' : unread}
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
          {items.length > 0 && (
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
        {loading ? (
          <p className="mt-3 text-sm font-bold text-stone-500">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="mt-3 text-sm font-bold text-stone-500">
            Nada por aqui ainda. Feche a semana no ranking pra começar a receber novidades.
          </p>
        ) : (
          <ul className="mt-3 flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            {items.map((item) => (
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
      </Modal>
    </>
  );
}
