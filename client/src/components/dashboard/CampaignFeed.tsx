import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Castle,
  Crown,
  Flag,
  HeartHandshake,
  Mountain,
  ScrollText,
  Shield,
  Skull,
  Sparkles,
  Swords,
} from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import {
  buildCampaignPosts,
  type CampaignCatalogInfo,
  type CampaignEventType,
  type CampaignPost,
} from '@shared/campaign';
import { xpLevelFromTotal, type AfkEnemyId } from '@/types';

const EVENT_STYLE: Record<CampaignEventType, { Icon: typeof Swords; className: string }> = {
  horda_contida: { Icon: Swords, className: 'bg-amber-100 text-amber-700' },
  monstro_derrotado: { Icon: Skull, className: 'bg-rose-100 text-rose-700' },
  chefe_derrotado: { Icon: Crown, className: 'bg-purple-100 text-purple-700' },
  vila_salva: { Icon: Flag, className: 'bg-emerald-100 text-emerald-700' },
  pessoa_resgatada: { Icon: HeartHandshake, className: 'bg-sky-100 text-sky-700' },
  defesa_heroica: { Icon: Shield, className: 'bg-slate-200 text-slate-700' },
  travessia: { Icon: Mountain, className: 'bg-orange-100 text-orange-800' },
  fortaleza_rompida: { Icon: Castle, className: 'bg-orange-100 text-orange-700' },
  poder_desperto: { Icon: Sparkles, className: 'bg-cyan-100 text-cyan-700' },
  capitulo: { Icon: ScrollText, className: 'bg-yellow-100 text-yellow-800' },
};

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
  const style = EVENT_STYLE[post.tipo] ?? EVENT_STYLE.monstro_derrotado;
  const { Icon } = style;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="game-campaign-post rounded-xl border border-stone-200 bg-white/70 p-3"
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
              ⚔ {post.exercicio.nome} · {post.exercicio.detalhe}
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
          {post.outros_exercicios.map((ex) => `${ex.nome} (${ex.detalhe})`).join(' · ')}
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
    return buildCampaignPosts(
      history.map((entry) => ({
        id: entry.id,
        treino_nome: entry.treino_nome,
        exercicios: entry.exercicios ?? [],
        duracao_total_segundos: entry.duracao_total_segundos,
        xp_ganho: entry.xp_ganho,
        concluido_em: entry.concluido_em,
      })),
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
