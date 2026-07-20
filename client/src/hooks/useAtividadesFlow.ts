import { useMemo, useRef, useState } from 'react';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { completeAtividade, updateMe } from '@/lib/api';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { playCompleteSet } from '@/lib/sounds';
import { toLocalDateKey } from '@/lib/utils';
import { formatMetricas } from '@/lib/atividade-format';
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
  /** Nome + detalhe de cada atividade concluída no fluxo — vira o capítulo de campanha. */
  feitas: { nome: string; detalhe: string }[];
}

/**
 * Estado + ações do fluxo sequencial de conclusão de Atividades. Extraído
 * do AtividadesCard pra ser reaproveitado também no encadeamento
 * treino → atividades do PlayerPage — mesma lógica de negócio, dois
 * lugares diferentes que podem disparar o fluxo (a fila do dia e a
 * celebração final ficam a critério de quem chama).
 */
export function useAtividadesFlow() {
  const { user, history, refresh, ensureHistory } = useApp();
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
    feitas: { nome: string; detalhe: string }[];
  }>({ xp: 0, moedas: 0, total: 0, streakCelebration: null, levelUp: null, feitas: [] });

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

  // Não filtra mais por `concluidasHoje`: quem tira um id da fila pendente
  // é a própria conclusão (ver `enviarConclusao`), removendo-o da fila
  // persistida. Isso é o que permite repetir — o usuário pode adicionar de
  // volta manualmente uma atividade já concluída hoje, e ela volta a valer.
  const filaPendente = useMemo(
    () => fila.map((id) => atividades.find((a) => a.id === id)).filter((a): a is AtividadeExtra => !!a),
    [fila, atividades],
  );

  const enviarConclusao = async (
    atividade: AtividadeExtra,
    dados: AtividadeConclusao,
  ): Promise<{ xp: number; moedas: number } | null> => {
    setBusy(true);
    try {
      const res = await completeAtividade(atividade.id, dados);
      applyUser(res.user);
      // `refresh()` não busca o histórico (só usuário/stats) — sem forçar o
      // reload aqui, `concluidasHoje`/`filaPendente` ficavam presos no
      // estado de antes da conclusão, como se nada tivesse acontecido.
      await Promise.all([refresh(), ensureHistory({ force: true })]);

      // Tira da fila persistida assim que conclui — sem isso ela nunca
      // encolhia (nada mais removia o id de lá) e a tela de atividades
      // parecia travada. Pra repetir, o usuário adiciona de volta na hora.
      if (user && fila.includes(atividade.id)) {
        try {
          const semAtual = fila.filter((id) => id !== atividade.id);
          const atualizado = await updateMe({
            preferencias: { ...user.preferencias, atividades_fila: { data: hoje, ids: semAtual } },
          });
          applyUser(atualizado);
          await refresh();
        } catch {
          // A conclusão em si já valeu (XP/streak salvos) — se só a limpeza
          // da fila falhar, não vale a pena travar o fluxo por isso.
        }
      }

      acumulado.current.xp += res.xp_ganho;
      acumulado.current.moedas += res.abdoria_ganha;
      acumulado.current.total += 1;
      acumulado.current.feitas.push({ nome: atividade.nome, detalhe: formatMetricas(dados.metricas) });
      if (res.streak_celebration) acumulado.current.streakCelebration = res.streak_celebration.streak_atual;
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
    acumulado.current = {
      xp: 0,
      moedas: 0,
      total: 0,
      streakCelebration: null,
      levelUp: null,
      feitas: [],
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
