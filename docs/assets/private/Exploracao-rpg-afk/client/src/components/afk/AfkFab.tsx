import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SCROLL_HIDE_THRESHOLD = 48;

interface Props {
  tutorialHighlight?: boolean;
}

/** Ação rápida da Home: cria um treino novo; a Exploração agora vive na navegação principal. */
export function AfkFab({ tutorialHighlight = false }: Props) {
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onScroll = () => setHidden(window.scrollY > SCROLL_HIDE_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      className={`game-afk-fab${hidden && !tutorialHighlight ? ' game-afk-fab--hidden' : ''}${tutorialHighlight ? ' game-afk-fab--tutorial' : ''}`}
      tabIndex={hidden || tutorialHighlight ? -1 : undefined}
      aria-hidden={(hidden && !tutorialHighlight) || undefined}
      disabled={tutorialHighlight}
      onClick={() => navigate('/construtor?modo=personalizar')}
      aria-label="Criar um treino"
    >
      <span className="game-afk-fab__glow" aria-hidden />
      <span className="game-afk-fab__icon" aria-hidden>
        <Plus size={30} strokeWidth={3} />
      </span>
      {tutorialHighlight ? (
        <span className="game-afk-fab__tutorial-label" aria-hidden>
          <strong>Criar treino</strong>
          <small>Use o + para montar uma nova rotina</small>
        </span>
      ) : null}
    </button>
  );
}
