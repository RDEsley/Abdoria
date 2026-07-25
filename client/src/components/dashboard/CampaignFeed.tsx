import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GameButton } from '@/components/ui/GameButton';
import { CAMPAIGN_EVENT_STYLE } from '@/components/campaign/campaign-style';
import { useCampaignPosts } from '@/hooks/useCampaignPosts';
import type { CampaignPost } from '@shared/campaign';

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
 * "missão do dia"). Só o capítulo mais recente aparece aqui; os anteriores
 * ficam no livro de capítulos (`/campanha`).
 */
export function CampaignFeed() {
  const navigate = useNavigate();
  const { posts, loading } = useCampaignPosts();

  if (loading) {
    return <p className="mt-3 text-sm text-stone-500">Abrindo o diário de campanha...</p>;
  }

  if (posts.length === 0) {
    return (
      <p className="mt-3 text-xs font-bold text-stone-500">
        O diário aguarda seu primeiro feito — conclua um treino e a história começa.
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2.5">
      <AnimatePresence initial={false}>
        <PostCard key={posts[0].id} post={posts[0]} />
      </AnimatePresence>
      {posts.length > 1 && (
        <GameButton
          variant="secondary"
          size="sm"
          onClick={() => navigate('/campanha')}
          className="mt-1"
        >
          Ver capítulos anteriores
        </GameButton>
      )}
    </div>
  );
}
