import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AfkFabSwords } from '@/components/afk/AfkFabSwords';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/context/AuthContext';
import { hasAfkRewardsToClaim } from '@shared/utils/afk';
import { updatePreferences } from '@/lib/api';

const AFK_AUTO_OPEN_KEY = 'abdoria_afk_auto_opened';

const SCROLL_HIDE_THRESHOLD = 48;

interface Props {
  tutorialHighlight?: boolean;
}

export function AfkFab({ tutorialHighlight = false }: Props) {
  const { stats } = useApp();
  const { user, applyUser } = useAuth();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);
  const [activating, setActivating] = useState(false);
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
  const discoveryKey = user?.id ? `abdoria_rpg_fab_discovered_${user.id}` : null;
  const locallyDiscovered = useMemo(
    () =>
      Boolean(
        discoveryKey &&
        typeof window !== 'undefined' &&
        window.localStorage.getItem(discoveryKey) === '1',
      ),
    [discoveryKey],
  );
  const hasDiscoveredRpg = Boolean(
    user?.preferencias?.rpg_fab_descoberto ||
    stats?.afk?.combat?.adventure_started ||
    locallyDiscovered,
  );

  const openExploration = async () => {
    if (activating) return;
    if (!user || hasDiscoveredRpg) {
      navigate('/exploracao');
      return;
    }

    if (discoveryKey) window.localStorage.setItem(discoveryKey, '1');
    applyUser({
      ...user,
      preferencias: { ...user.preferencias, rpg_fab_descoberto: true },
    });
    setActivating(true);
    try {
      applyUser(await updatePreferences({ rpg_fab_descoberto: true }));
    } catch {
      // A marca local mantém a descoberta estável e a entrada no RPG não
      // fica bloqueada por uma falha transitória de conexão.
    } finally {
      navigate('/exploracao');
      setActivating(false);
    }
  };

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
      className={`game-afk-fab${hasRewards ? ' game-afk-fab--loot' : ''}${!hasDiscoveredRpg && !tutorialHighlight ? ' game-afk-fab--discover' : ''}${hidden && !tutorialHighlight ? ' game-afk-fab--hidden' : ''}${tutorialHighlight ? ' game-afk-fab--tutorial' : ''}`}
      tabIndex={hidden || tutorialHighlight ? -1 : undefined}
      aria-hidden={(hidden && !tutorialHighlight) || undefined}
      disabled={tutorialHighlight || activating}
      aria-busy={activating || undefined}
      onClick={() => void openExploration()}
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
