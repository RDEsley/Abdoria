import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { XpOrbLayer } from '@/components/effects/XpOrbLayer';
import { LevelUpOverlay } from '@/components/effects/LevelUpOverlay';
import { CursorEffects } from '@/components/effects/CursorEffects';
import { CosmeticUnlockCelebration } from '@/components/cosmetics/CosmeticUnlockCelebration';
import { GameToastHost } from '@/components/ui/GameToast';
import type { LevelUpCelebration as LevelUpData } from '@/types';

/**
 * Camadas globais de efeito (bolinhas de XP, level up, desbloqueio de
 * cosmético, toasts) — vivem em AppDataProvider (não em AppLayout) porque
 * `player`/`atividades-player`/`campanha`/`exploracao` são rotas irmãs de
 * AppLayout, sem a chrome (TopNavbar/sidebar). Antes disso, ganhar XP/level
 * up durante um treino ou atividade (as fontes principais de XP do app)
 * disparava o evento pro vazio: nenhum listener estava montado pra reagir. */
export function GlobalEffectsHost() {
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);

  useEffect(() => {
    // Espera as bolinhas de XP (ver XpOrbLayer) terminarem de convergir na
    // barra do topo antes de tomar a tela inteira — sem isso a celebração
    // cobria a animação de preenchimento e o jogador nunca via a barra subir.
    const LEVEL_UP_DELAY_MS = 1250;
    let timer: number | null = null;
    const onLevelUp = (event: Event) => {
      const detail = (event as CustomEvent<LevelUpData>).detail;
      const levelNovo = detail?.level_novo;
      if (!levelNovo) return;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setLevelUpLevel(levelNovo), LEVEL_UP_DELAY_MS);
    };
    window.addEventListener('abdoria:level-up', onLevelUp);
    return () => {
      window.removeEventListener('abdoria:level-up', onLevelUp);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {levelUpLevel !== null && (
          <LevelUpOverlay
            key={levelUpLevel}
            level={levelUpLevel}
            onDone={() => setLevelUpLevel(null)}
          />
        )}
      </AnimatePresence>

      <CursorEffects />
      <XpOrbLayer />
      <CosmeticUnlockCelebration />
      <GameToastHost />
    </>
  );
}
