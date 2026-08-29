import { useEffect, useMemo } from 'react';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import {
  buildCampaignPosts,
  type CampaignCatalogInfo,
  type CampaignPost,
  type CampaignSession,
} from '@shared/campaign';
import { isAtividadeHistory } from '@shared/atividades';
import { toLocalDateKey } from '@/lib/utils';
import { formatMetricas } from '@/lib/atividade-format';
import { xpLevelFromTotal } from '@/types';

/**
 * Posts do Mapa de Campanha (mais recente primeiro) — extraído do `CampaignFeed` pra
 * reaproveitar no livro de capítulos sem duplicar a montagem de sessões.
 */
export function useCampaignPosts(): { posts: CampaignPost[]; loading: boolean } {
  const { history, ensureHistory, historyLoading, exercises, ensureExercises } = useApp();
  const { user } = useAuth();

  useEffect(() => {
    void ensureHistory();
    void ensureExercises();
  }, [ensureHistory, ensureExercises]);

  const posts = useMemo(() => {
    if (!user || history.length === 0) return [];
    const catalogBySlug = new Map<string, CampaignCatalogInfo>(
      exercises.map((ex) => [
        ex.slug,
        {
          nivel: ex.nivel,
          prioridade: ex.prioridade,
          musculo_principal: ex.musculo_principal,
          grupos: ex.grupos,
          nome_pt: ex.nome_pt,
        },
      ]),
    );
    const treinoSessions: CampaignSession[] = [];
    const atividadesPorDia = new Map<string, typeof history>();
    for (const entry of history) {
      if (isAtividadeHistory(entry.treino_nome) && entry.atividade) {
        const dia = toLocalDateKey(entry.concluido_em);
        const grupo = atividadesPorDia.get(dia) ?? [];
        grupo.push(entry);
        atividadesPorDia.set(dia, grupo);
        continue;
      }
      treinoSessions.push({
        id: entry.id,
        treino_nome: entry.treino_nome,
        exercicios: entry.exercicios ?? [],
        duracao_total_segundos: entry.duracao_total_segundos,
        xp_ganho: entry.xp_ganho,
        concluido_em: entry.concluido_em,
      });
    }

    const atividadeSessions: CampaignSession[] = [...atividadesPorDia.entries()].map(
      ([dia, entries]) => {
        const ordenadas = [...entries].sort(
          (a, b) => new Date(a.concluido_em).getTime() - new Date(b.concluido_em).getTime(),
        );
        const ultima = ordenadas[ordenadas.length - 1];
        return {
          id: `atividades-${dia}`,
          treino_nome: 'Atividades',
          exercicios: [],
          duracao_total_segundos: ordenadas.reduce(
            (acc, e) => acc + (e.duracao_total_segundos ?? 0),
            0,
          ),
          xp_ganho: ordenadas.reduce((acc, e) => acc + (e.xp_ganho ?? 0), 0),
          concluido_em: ultima.concluido_em,
          isAtividade: true,
          atividadesFeitas: ordenadas.map((e) => ({
            nome: e.atividade!.nome,
            detalhe: formatMetricas(e.atividade!.metricas),
          })),
        };
      },
    );

    return buildCampaignPosts([...treinoSessions, ...atividadeSessions], catalogBySlug, {
      heroi: user.nome?.split(' ')[0] ?? 'O herói',
      level: xpLevelFromTotal(user.gamificacao?.nivel_xp ?? 0),
    });
  }, [history, exercises, user]);

  return { posts, loading: historyLoading };
}
