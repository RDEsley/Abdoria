import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AfkFabSwords } from '@/components/afk/AfkFabSwords';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { hasAfkRewardsToClaim } from '@shared/utils/afk';

const AFK_AUTO_OPEN_KEY = 'abdoria_afk_auto_opened';

const SCROLL_HIDE_THRESHOLD = 48;

interface Props {
  tutorialHighlight?: boolean;
}

export function AfkFab({ tutorialHighlight = false }: Props) {
  const { stats } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);
  const autoOpenedRef = useRef(false);

  // Estilo Strava: some ao rolar pra baixo e só reaparece de volta ao topo.
  useEffect(() => {
    const onScroll = () => setHidden(window.scrollY > SCROLL_HIDE_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const hasRewards =
    stats?.afk?.has_rewards ?? (stats?.afk ? hasAfkRewardsToClaim(stats.afk) : false);

  // Desligado por padrão (Configurações → Exploração) — entrar no app não
  // deve levar direto pra Exploração sem o jogador escolher; quem prefere o
  // comportamento antigo liga a preferência.
  useEffect(() => {
    if (!hasRewards || !user?.preferencias?.exploracao_auto_abrir || autoOpenedRef.current) return;
    if (sessionStorage.getItem(AFK_AUTO_OPEN_KEY) === '1') return;
    autoOpenedRef.current = true;
    sessionStorage.setItem(AFK_AUTO_OPEN_KEY, '1');
    navigate('/exploracao');
  }, [hasRewards, navigate, user?.preferencias?.exploracao_auto_abrir]);

  return (
    <button
      type="button"
      className={`game-afk-fab${hasRewards ? ' game-afk-fab--loot' : ''}${hidden && !tutorialHighlight ? ' game-afk-fab--hidden' : ''}${tutorialHighlight ? ' game-afk-fab--tutorial' : ''}`}
      tabIndex={hidden || tutorialHighlight ? -1 : undefined}
      aria-hidden={(hidden && !tutorialHighlight) || undefined}
      disabled={tutorialHighlight}
      onClick={() => navigate('/exploracao')}
      aria-label={
        hasRewards
          ? 'Exploração de Abdoria — recompensas disponíveis'
          : 'Abrir exploração de Abdoria'
      }
    >
      <span className="game-afk-fab__glow" aria-hidden />
      <span className="game-afk-fab__icon" aria-hidden>
        <AfkFabSwords />
      </span>
      {tutorialHighlight ? (
        <span className="game-afk-fab__tutorial-label" aria-hidden>
          <strong>RPG e Exploração</strong>
          <small>Este botão fica sempre aqui na Home</small>
        </span>
      ) : null}
      {hasRewards && (
        <span className="game-afk-fab__badge" aria-hidden>
          <span className="game-afk-fab__badge-core" />
        </span>
      )}
    </button>
  );
}
