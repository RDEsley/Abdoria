import { useEffect } from 'react';
import { updateMe } from '@/lib/api';
import { showGameToast } from '@/lib/game-toast';
import { getErrorMessage } from '@/lib/api-errors';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/hooks/useAuth';
import type { IUserDocument } from '@/types';

let sharedUser: IUserDocument | null = null;
let persistChain: Promise<unknown> = Promise.resolve();
let persistSeq = 0;

/**
 * Update otimista de `preferencias`, serializado numa fila global — a UI
 * atualiza na hora; o `updateMe` roda em segundo plano. Uma única fila
 * no módulo evita corrida entre Atividades, notas e lembretes.
 */
export function usePreferencesPersist() {
  const { user, refresh, applyUser: applyAppUser } = useApp();
  const { applyUser } = useAuth();

  useEffect(() => {
    sharedUser = user;
  }, [user]);

  const applyServerUser = (next: Parameters<typeof applyUser>[0]): void => {
    const merged = { ...next, preferencias: sharedUser?.preferencias ?? next.preferencias };
    sharedUser = merged;
    applyUser(merged);
    applyAppUser(merged);
  };

  const persist = (
    patch: Record<string, unknown>,
    mensagem?: string,
    onPersisted?: () => void,
  ): Promise<void> => {
    const base = sharedUser ?? user;
    if (!base) return Promise.resolve();

    const preferencias = { ...base.preferencias, ...patch };
    const otimista = { ...base, preferencias };
    sharedUser = otimista;
    applyUser(otimista);
    applyAppUser(otimista);

    const seq = ++persistSeq;
    const task = persistChain
      .then(() => updateMe({ preferencias }))
      .then((atualizado) => {
        if (seq !== persistSeq) return;
        sharedUser = atualizado;
        applyUser(atualizado);
        applyAppUser(atualizado);
        if (mensagem) showGameToast(mensagem, { variant: 'success' });
        onPersisted?.();
      })
      .catch((err) => {
        if (seq !== persistSeq) return;
        showGameToast(getErrorMessage(err, 'Não foi possível salvar — desfazendo.'), {
          variant: 'error',
        });
        return refresh();
      })
      .then(() => undefined);

    persistChain = task;
    return task;
  };

  return { user, persist, applyServerUser };
}
