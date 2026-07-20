import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GameButton } from '@/components/ui/GameButton';
import { CAMPAIGN_EVENT_STYLE } from '@/components/campaign/campaign-style';
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
import { xpLevelFromTotal, type AfkEnemyId } from '@/types';

function relativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 1) return 'agora há pouco';
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'ontem';
  if (diffD < 7) return `há ${diffD} dias`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function PostCard({ post }: { post: CampaignPost }) {
  const style = CAMPAIGN_EVENT_STYLE[post.tipo] ?? CAMPAIGN_EVENT_STYLE.monstro_derrotado;
  const { Icon } = style;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="game-campaign-post game-campaign-card-bg rounded-xl p-3"
    >
      <header className="flex items-center gap-2">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.className}`}
          aria-hidden
        >
          <Icon size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-extrabold text-stone-800">
            {post.tipo_label} · {post.lugar}
          </p>
          <p className="text-[0.65rem] font-bold text-stone-400">
            {relativeDate(post.concluido_em)}
          </p>
        </div>
      </header>
      <p className="mt-2 text-xs font-medium leading-relaxed text-stone-600">{post.mensagem}</p>
      {(post.exercicio || post.xp != null) && (
        <footer className="mt-2 flex flex-wrap items-center gap-1.5">
          {post.exercicio && (
            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[0.65rem] font-bold text-stone-600">
              {post.tipo === 'missao_pessoal' ? '✦' : '⚔'} {post.exercicio.nome}
              {post.exercicio.detalhe ? ` · ${post.exercicio.detalhe}` : ''}
            </span>
          )}
          {post.xp != null && post.xp > 0 && (
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-700">
              +{post.xp} XP
            </span>
          )}
        </footer>
      )}
      {post.outros_exercicios.length > 0 && (
        <p className="mt-1.5 truncate text-[0.6rem] font-semibold text-stone-400">
          Também na sessão:{' '}
          {post.outros_exercicios
            .map((ex) => (ex.detalhe ? `${ex.nome} (${ex.detalhe})` : ex.nome))
            .join(' · ')}
        </p>
      )}
    </motion.article>
  );
}

/**
 * Feed narrativo do Mapa da Campanha — 1 post por sessão de treino (a
 * "missão do dia"). Só o capítulo mais recente aparece por padrão.
 */
export function CampaignFeed() {
  const { history, ensureHistory, historyLoading, exercises, ensureExercises } = useApp();
  const { user } = useAuth();
  const [showAll, setShowAll] = useState(false);

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
    // Sessões de treino entram 1:1; sessões de Atividade (sem exercícios pra
    // narrar como combate) são agrupadas por dia — vira 1 "missão pessoal" por
    // dia, igual ao treino, em vez de 1 post por atividade concluída.
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

    return buildCampaignPosts(
      [...treinoSessions, ...atividadeSessions],
      catalogBySlug,
      {
        heroi: user.nome?.split(' ')[0] ?? 'O herói',
        level: xpLevelFromTotal(user.gamificacao?.nivel_xp ?? 0),
        bestiarioDesbloqueados: (user.gamificacao?.bestiario_desbloqueados ?? []) as AfkEnemyId[],
      },
    );
  }, [history, exercises, user]);

  if (historyLoading) {
    return <p className="mt-3 text-sm text-stone-500">Abrindo o diário de campanha...</p>;
  }

  if (posts.length === 0) {
    return (
      <p className="mt-3 text-xs font-bold text-stone-500">
        O diário aguarda seu primeiro feito — conclua um treino e a história começa.
      </p>
    );
  }

  const visible = showAll ? posts : posts.slice(0, 1);

  return (
    <div className="mt-4 flex flex-col gap-2.5">
      <AnimatePresence initial={false}>
        {visible.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </AnimatePresence>
      {posts.length > 1 && (
        <GameButton
          variant="secondary"
          size="sm"
          onClick={() => setShowAll((v) => !v)}
          className="mt-1"
        >
          {showAll ? 'Ver menos' : 'Ver capítulos anteriores'}
        </GameButton>
      )}
    </div>
  );
}
