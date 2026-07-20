import { useMemo, useRef, useState } from 'react';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { completeAtividade } from '@/lib/api';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { playCompleteSet } from '@/lib/sounds';
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
  const { user, history, refresh } = useApp();
  const { applyUser } = useAuth();

  const [busy, setBusy] = useState(false);
  const [passoFila, setPassoFila] = useState<number | null>(null);
  const [totalFluxo, setTotalFluxo] = useState(0);
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
    const dias = user?.perfil_treino?.dias_semana;
    return Array.isArray(dias) && dias.length > 0 && dias.includes(getSaoPauloWeekday());
  }, [user?.perfil_treino?.dias_semana]);

  const concluidasHoje = useMemo(() => {
    const todayKey = toLocalDateKey(new Date());
    const nomes = new Set<string>();
    for (const entry of history) {
      if (toLocalDateKey(entry.concluido_em) !== todayKey) continue;
      if (isAtividadeHistory(entry.treino_nome)) {
        nomes.add(entry.treino_nome.replace(/^Atividade:\s*/, ''));
      }
    }
    return nomes;
  }, [history]);

  const filaPendente = useMemo(
    () =>
      fila
        .map((id) => atividades.find((a) => a.id === id))
        .filter((a): a is AtividadeExtra => !!a && !concluidasHoje.has(a.nome)),
    [fila, atividades, concluidasHoje],
  );

  const enviarConclusao = async (
    atividade: AtividadeExtra,
    dados: AtividadeConclusao,
  ): Promise<boolean> => {
    setBusy(true);
    try {
      const res = await completeAtividade(atividade.id, dados);
      applyUser(res.user);
      await refresh();
      acumulado.current.xp += res.xp_ganho;
      acumulado.current.moedas += res.abdoria_ganha;
      acumulado.current.total += 1;
      if (res.streak_celebration) acumulado.current.streakCelebration = res.streak_celebration.streak_atual;
      if (res.level_up) acumulado.current.levelUp = res.level_up;
      playCompleteSet();
      return true;
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível concluir a atividade.'), {
        variant: 'error',
      });
      return false;
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
    acumulado.current = { xp: 0, moedas: 0, total: 0, streakCelebration: null, levelUp: null };
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

    const ok = await enviarConclusao(atividade, dados);
    if (!ok) return;

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
