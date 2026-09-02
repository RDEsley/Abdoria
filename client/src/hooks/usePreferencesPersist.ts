import { useEffect, useRef } from 'react';
import { updateMe } from '@/lib/api';
import { showGameToast } from '@/lib/game-toast';
import { getErrorMessage } from '@/lib/api-errors';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/hooks/useAuth';

/**
 * Update otimista de `preferencias`, serializado numa fila — a UI atualiza
 * NA HORA com o estado otimista; o `updateMe` roda em segundo plano numa
 * fila serializada (cliques rápidos chegam ao servidor em ordem). `seqRef`
 * garante que só a ÚLTIMA resposta do servidor reconcilia o estado
 * (respostas antigas não regridem um otimista mais novo). Falha desfaz
 * voltando pro servidor. Extraído de AtividadesCard (mesmo padrão usado
 * pelo Bloco de Notas) pra não duplicar a fila de persistência.
 */
export function usePreferencesPersist() {
  const { user, refresh, applyUser: applyAppUser } = useApp();
  const { applyUser } = useAuth();

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());
  const seqRef = useRef(0);

  /**
   * Aplica um usuário devolvido por OUTRA rota (XP de lembrete, moedas...)
   * preservando as `preferencias` locais — esta fila é a dona delas.
   *
   * Essas rotas leem o perfil no início da request e devolvem ele inteiro, o
   * que inclui `preferencias` como estavam ANTES do `updateMe` daqui. Aplicar
   * a resposta crua desfaz na tela a alteração recém-feita (era isso que fazia
   * um lembrete recém-concluído voltar a aparecer como pendente).
   */
  const applyServerUser = (next: Parameters<typeof applyUser>[0]): void => {
    const merged = { ...next, preferencias: userRef.current?.preferencias ?? next.preferencias };
    userRef.current = merged;
    applyUser(merged);
    applyAppUser(merged);
  };

  const persist = (
    patch: Record<string, unknown>,
    mensagem?: string,
    onPersisted?: () => void,
  ): Promise<void> => {
    const base = userRef.current;
    if (!base) return Promise.resolve();

    const preferencias = { ...base.preferencias, ...patch };
    const otimista = { ...base, preferencias };
    userRef.current = otimista;
    applyUser(otimista);
    applyAppUser(otimista);

    const seq = ++seqRef.current;
    const task = chainRef.current
      .then(() => updateMe({ preferencias }))
      .then((atualizado) => {
        if (seq !== seqRef.current) return;
        userRef.current = atualizado;
        applyUser(atualizado);
        applyAppUser(atualizado);
        if (mensagem) showGameToast(mensagem, { variant: 'success' });
        onPersisted?.();
      })
      .catch((err) => {
        if (seq !== seqRef.current) return;
        showGameToast(getErrorMessage(err, 'Não foi possível salvar — desfazendo.'), {
          variant: 'error',
        });
        return refresh();
      })
      .then(() => undefined);

    chainRef.current = task;
    return task;
  };

  return { user, persist, applyServerUser };
}
