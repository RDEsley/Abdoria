import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Feather, X, Zap } from 'lucide-react';
import { PageLoader } from '@/components/ui/PageLoader';
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
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const pageVariants = {
  enter: (direction: number) => ({ rotateY: direction > 0 ? 78 : -78, opacity: 0 }),
  center: { rotateY: 0, opacity: 1 },
  exit: (direction: number) => ({ rotateY: direction > 0 ? -78 : 78, opacity: 0 }),
};

function ChapterPage({ post }: { post: CampaignPost }) {
  const style = CAMPAIGN_EVENT_STYLE[post.tipo] ?? CAMPAIGN_EVENT_STYLE.monstro_derrotado;
  const { Icon } = style;
  return (
    <>
      <header className="campaign-book__page-head">
        <span className={`campaign-book__page-icon ${style.className}`} aria-hidden>
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="campaign-book__page-title">
            {post.tipo_label} · {post.lugar}
          </p>
          <p className="campaign-book__page-date">{relativeDate(post.concluido_em)}</p>
        </div>
      </header>

      <p className="campaign-book__page-text">{post.mensagem}</p>

      {(post.exercicio || post.xp != null) && (
        <footer className="campaign-book__page-chips">
          {post.exercicio && (
            <span className="campaign-book__page-chip">
              {post.tipo === 'missao_pessoal' ? '✦' : '⚔'} {post.exercicio.nome}
              {post.exercicio.detalhe ? ` · ${post.exercicio.detalhe}` : ''}
            </span>
          )}
          {post.xp != null && post.xp > 0 && (
            <span className="campaign-book__page-chip campaign-book__page-chip--xp">
              <Zap size={11} aria-hidden /> +{post.xp} XP
            </span>
          )}
        </footer>
      )}

      {post.outros_exercicios.length > 0 && (
        <p className="campaign-book__page-extra">
          Também nessa missão:{' '}
          {post.outros_exercicios
            .map((ex) => (ex.detalhe ? `${ex.nome} (${ex.detalhe})` : ex.nome))
            .join(' · ')}
        </p>
      )}
    </>
  );
}

/**
 * Livro de capítulos do Mapa de Campanha — cada post vira uma página com
 * animação de virada (rotateY 3D). Navega por setas ou digitando o número
 * da página; passar da última página real mostra "História sendo escrita...".
 */
export function CampaignBookPage() {
  const navigate = useNavigate();
  const { posts, loading } = useCampaignPosts();
  const [pageIndex, setPageIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [editingPage, setEditingPage] = useState(false);
  const [pageInput, setPageInput] = useState('');

  const totalPages = posts.length + 1;
  const isEndingPage = pageIndex >= posts.length;
  const post = useMemo(() => (isEndingPage ? null : posts[pageIndex]), [isEndingPage, pageIndex, posts]);

  if (loading) return <PageLoader />;

  const goTo = (target: number) => {
    const clamped = Math.max(0, Math.min(totalPages - 1, target));
    if (clamped === pageIndex) return;
    setDirection(clamped > pageIndex ? 1 : -1);
    setPageIndex(clamped);
  };

  const startEditingPage = () => {
    setPageInput(String(pageIndex + 1));
    setEditingPage(true);
  };

  const submitPageInput = () => {
    const n = Number.parseInt(pageInput, 10);
    if (Number.isFinite(n)) goTo(n - 1);
    setEditingPage(false);
  };

  return (
    <div className="game-campaign-book game-app fixed inset-0 z-50 flex flex-col overflow-hidden">
      <header className="campaign-book__header">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="campaign-book__close"
          aria-label="Fechar diário"
          title="Fechar"
        >
          <X size={20} />
        </button>
        <p className="campaign-book__header-title">
          <Feather size={13} aria-hidden /> Diário de Campanha
        </p>
        <span className="w-9" aria-hidden />
      </header>

      <div className="campaign-book__stage">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.article
            key={pageIndex}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.38, ease: 'easeInOut' }}
            className="campaign-book__page"
          >
            <span className="campaign-book__fold" aria-hidden />
            {isEndingPage ? (
              <div className="campaign-book__ending">
                <Feather size={26} aria-hidden />
                <p className="campaign-book__ending-title">História sendo escrita...</p>
                <p className="campaign-book__ending-hint">
                  Complete mais missões pra continuar a lenda.
                </p>
              </div>
            ) : post ? (
              <ChapterPage post={post} />
            ) : null}
          </motion.article>
        </AnimatePresence>
      </div>

      <footer className="campaign-book__nav">
        <button
          type="button"
          className="campaign-book__nav-btn"
          disabled={pageIndex === 0}
          onClick={() => goTo(pageIndex - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft size={18} />
        </button>

        {editingPage ? (
          <input
            autoFocus
            inputMode="numeric"
            className="campaign-book__page-input"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={submitPageInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitPageInput();
              if (e.key === 'Escape') setEditingPage(false);
            }}
          />
        ) : (
          <button
            type="button"
            className="campaign-book__page-indicator"
            onClick={startEditingPage}
            title="Toque para ir direto a uma página"
          >
            {pageIndex + 1} / {totalPages}
          </button>
        )}

        <button
          type="button"
          className="campaign-book__nav-btn"
          disabled={pageIndex === totalPages - 1}
          onClick={() => goTo(pageIndex + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight size={18} />
        </button>
      </footer>
    </div>
  );
}
