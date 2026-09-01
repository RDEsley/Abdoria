import { useMemo, useRef, useState } from 'react';
import { useApp } from '@/hooks/useApp';
import { completeAtividade, updateMe } from '@/lib/api';
import { showGameToast } from '@/lib/game-toast';
import { getErrorMessage } from '@/lib/api-errors';
import { playCompleteSet } from '@/lib/sounds';
import { emitXpEarned } from '@/lib/xp-orbs';
import { toLocalDateKey } from '@/lib/utils';
import {
  agendaCobreDia,
  isAtividadeHistory,
  resolveAgenda,
  resolveAtividades,
  resolveFila,
  type AtividadeExtra,
} from '@shared/atividades';
import { getSaoPauloWeekday, getTodaySaoPaulo } from '@shared/utils/timezone';
import type { AtividadeConclusao } from '@/components/dashboard/AtividadeCompleteModal';
import type { LevelUpCelebration as LevelUpData } from '@/types';

export interface AtividadesFluxoResumo {
  total: number;
  xp: number;
  moedas: number;
  streakCelebration: number | null;
  levelUp: LevelUpData | null;
}

/**
 * Estado + ações do fluxo sequencial de conclusão de Atividades. Extraído
 * do AtividadesCard pra ser reaproveitado também no encadeamento
 * treino → atividades do PlayerPage — mesma lógica de negócio, dois
 * lugares diferentes que podem disparar o fluxo (a fila do dia e a
 * celebração final ficam a critério de quem chama).
 */
export function useAtividadesFlow() {
  const { user, history, refresh, ensureHistory, markStreakSecuredToday } = useApp();

  const [busy, setBusy] = useState(false);
  const [passoFila, setPassoFila] = useState<number | null>(null);
  const [totalFluxo, setTotalFluxo] = useState(0);
  // Concluídas nesta sessão, aplicadas na hora. A fila persistida e o
  // histórico só refletem a conclusão depois de mais duas idas ao servidor;
  // sem este registro local, a tela ficava parada esperando os dois — era a
  // maior parte da lentidão percebida ao concluir uma atividade.
  const [concluidasLocal, setConcluidasLocal] = useState<Set<string>>(new Set());
  const acumulado = useRef<{
    xp: number;
    moedas: number;
    total: number;
    streakCelebration: number | null;
    levelUp: LevelUpData | null;
  }>({ xp: 0, moedas: 0, total: 0, streakCelebration: null, levelUp: null });

  const hoje = getTodaySaoPaulo();
  const atividades = useMemo(() => resolveAtividades(user?.preferencias), [user?.preferencias]);
  const fila = useMemo(() => resolveFila(user?.preferencias, hoje), [user?.preferencias, hoje]);
  const agenda = useMemo(() => resolveAgenda(user?.preferencias), [user?.preferencias]);
  const hojeNaAgenda = useMemo(() => agendaCobreDia(agenda, getSaoPauloWeekday()), [agenda]);

  const diaDeTreino = useMemo(() => {
    const dias = user?.ab_training_profile_v2?.training_days ?? user?.perfil_treino?.dias_semana;
    return Array.isArray(dias) && dias.length > 0 && dias.includes(getSaoPauloWeekday());
  }, [user?.ab_training_profile_v2?.training_days, user?.perfil_treino?.dias_semana]);

  const concluidasHoje = useMemo(() => {
    const todayKey = toLocalDateKey(new Date());
    const nomes = new Set<string>();
    for (const entry of history) {
      if (toLocalDateKey(entry.concluido_em) !== todayKey) continue;
      if (isAtividadeHistory(entry.treino_nome)) {
        nomes.add(entry.treino_nome.replace(/^Atividade:\s*/, ''));
      }
    }
    // Junta as desta sessão que o histórico ainda não devolveu, pra marcação
    // e contador reagirem no mesmo instante do clique.
    for (const id of concluidasLocal) {
      const atividade = atividades.find((a) => a.id === id);
      if (atividade) nomes.add(atividade.nome);
    }
    return nomes;
  }, [history, concluidasLocal, atividades]);

  // Não filtra mais por `concluidasHoje`: quem tira um id da fila pendente
  // é a própria conclusão (ver `enviarConclusao`), removendo-o da fila
  // persistida. Isso é o que permite repetir — o usuário pode adicionar de
  // volta manualmente uma atividade já concluída hoje, e ela volta a valer.
  //
  // A ordem segue `atividades` (a lista mestre, reordenável pelo usuário),
  // não a ordem de inserção na fila — assim mover uma atividade de posição
  // no card também reorganiza a ordem no atividade-player.
  const filaPendente = useMemo(
    () => atividades.filter((a) => fila.includes(a.id) && !concluidasLocal.has(a.id)),
    [fila, atividades, concluidasLocal],
  );

  const enviarConclusao = async (
    atividade: AtividadeExtra,
    dados: AtividadeConclusao,
  ): Promise<{ xp: number; moedas: number } | null> => {
    setBusy(true);
    try {
      const res = await completeAtividade(atividade.id, dados);
      markStreakSecuredToday(res.user);

      // A partir daqui a conclusão JÁ VALEU no servidor (XP/streak salvos) e
      // a resposta trouxe o usuário atualizado. Marca localmente e libera a
      // tela na hora; limpeza da fila, refresh e histórico continuam em
      // segundo plano. Antes, essas três chamadas ficavam no caminho crítico
      // e o usuário esperava ~3 idas ao servidor por atividade concluída.
      setConcluidasLocal((prev) => new Set(prev).add(atividade.id));

      // Tira da fila persistida — sem isso ela nunca encolhia (nada mais
      // remove o id de lá). Pra repetir, o usuário adiciona de volta na hora.
      if (user && fila.includes(atividade.id)) {
        const semAtual = fila.filter((id) => id !== atividade.id);
        void updateMe({
          preferencias: { ...user.preferencias, atividades_fila: { data: hoje, ids: semAtual } },
        })
          .catch(() => {
            // Só a limpeza da fila falhou — a conclusão em si está salva, não
            // vale travar o fluxo nem alarmar o usuário por isso.
          })
          .finally(() => {
            // Confirma também a fila depois que a tentativa de persistência
            // terminar; o refresh imediato abaixo cuida do aviso de streak.
            void refresh();
          });
      }
      // A sincronização não depende da limpeza da fila: a conclusão já
      // valeu mesmo se a atualização das preferências falhar.
      void refresh();
      void ensureHistory({ force: true });

      acumulado.current.xp += res.xp_ganho;
      acumulado.current.moedas += res.abdoria_ganha;
      acumulado.current.total += 1;
      emitXpEarned(res.xp_ganho);
      if (res.streak_celebration)
        acumulado.current.streakCelebration = res.streak_celebration.streak_atual;
      if (res.level_up) {
        acumulado.current.levelUp = res.level_up;
        // Mesmo evento global do treino — mesma celebração cinemática pros dois fluxos.
        window.dispatchEvent(new CustomEvent('abdoria:level-up', { detail: res.level_up }));
      }
      playCompleteSet();
      return { xp: res.xp_ganho, moedas: res.abdoria_ganha };
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível concluir a atividade.'), {
        variant: 'error',
      });
      return null;
    } finally {
      setBusy(false);
    }
  };

  /** Começa o fluxo sequencial pela fila pendente de hoje. */
  const iniciarFluxo = () => {
    setTotalFluxo(filaPendente.length);
    setPassoFila(0);
  };

  /** Encerra o fluxo (fim natural ou cancelamento) e devolve o resumo acumulado. */
  const fecharFluxo = (): AtividadesFluxoResumo => {
    const resumo: AtividadesFluxoResumo = { ...acumulado.current };
    setPassoFila(null);
    // O histórico/fila do servidor já chegaram (ou chegam logo) com as
    // conclusões; manter o registro local depois disso esconderia uma
    // atividade re-enfileirada pra repetir no mesmo dia.
    setConcluidasLocal(new Set());
    acumulado.current = {
      xp: 0,
      moedas: 0,
      total: 0,
      streakCelebration: null,
      levelUp: null,
    };
    return resumo;
  };

  /** Conclui o passo atual e avança; ao acabar a fila, chama `onDone` com o resumo. */
  const concluirPassoFila = async (
    dados: AtividadeConclusao,
    onDone: (resumo: AtividadesFluxoResumo) => void,
  ) => {
    const indice = passoFila ?? 0;
    const atividade = filaPendente[indice];
    if (!atividade) return;

    const resultado = await enviarConclusao(atividade, dados);
    if (!resultado) return;

    // `filaPendente` só encolhe depois do refresh, então o próximo item
    // continua sendo o índice atual; o fluxo acaba quando não sobra nada.
    const restam = filaPendente.length - 1 - indice;
    if (restam > 0) {
      setPassoFila(indice + 1);
      return;
    }
    onDone(fecharFluxo());
  };

  /**
   * Conclui uma atividade escolhida livremente (fora da ordem estrita da
   * fila) — não fecha o fluxo sozinha, quem chama decide (deixar aberto pra
   * escolher outra, ou fechar quando o usuário terminar/sair).
   */
  const concluirEscolhida = (atividade: AtividadeExtra, dados: AtividadeConclusao) =>
    enviarConclusao(atividade, dados);

  const atividadeDoPasso = passoFila != null ? filaPendente[passoFila] : null;

  return {
    busy,
    atividades,
    fila,
    agenda,
    hojeNaAgenda,
    diaDeTreino,
    concluidasHoje,
    filaPendente,
    passoFila,
    totalFluxo,
    atividadeDoPasso,
    iniciarFluxo,
    fecharFluxo,
    concluirPassoFila,
    concluirEscolhida,
  };
}
