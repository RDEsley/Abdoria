import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface Props {
  bestiaryUnlocked: number;
  bestiaryTotal: number;
  onOpenShop: () => void;
  onOpenBestiary: () => void;
  onContinue: () => void;
}

const VILLAGE_IMAGES = [
  '/assets/background-afk-banner.png',
  '/assets/loja-da-vila.png',
  '/assets/museu-da-vila-bestiario.png',
];

/** Módulo: uma vez carregadas nesta sessão, as próximas visitas à vila não
    esperam de novo (evita até o flash do loading num cache já quente). */
let villageImagesLoaded = false;

/** Pré-carrega fundo/loja/museu antes de revelar a vila — faltava o fundo
    nessa lista (só loja+museu eram esperados), então ele "pipocava" depois
    dos outros dois já prontos, mesmo com o loading em tela. */
function useVillageImagesReady(): boolean {
  const [ready, setReady] = useState(villageImagesLoaded);

  useEffect(() => {
    if (villageImagesLoaded) return undefined;
    let cancelled = false;
    let remaining = VILLAGE_IMAGES.length;
    const onSettle = () => {
      remaining -= 1;
      if (remaining > 0 || cancelled) return;
      villageImagesLoaded = true;
      setReady(true);
    };
    VILLAGE_IMAGES.forEach((src) => {
      const img = new Image();
      img.onload = onSettle;
      img.onerror = onSettle;
      img.src = src;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}

/**
 * Cena de hub entre patrulhas: a vila. Fundo é a imagem
 * background-afk-banner.png (via CSS); a loja e o museu (bestiário) são
 * duas imagens sobrepostas nas posições certas, ambas clicáveis. Sem
 * personagem em cena: a vila é só o hub de navegação, o herói só aparece de
 * verdade na exploração.
 */
export function AfkVillageScene({
  bestiaryUnlocked,
  bestiaryTotal,
  onOpenShop,
  onOpenBestiary,
  onContinue,
}: Props) {
  const imagesReady = useVillageImagesReady();

  if (!imagesReady) {
    return (
      <div className="game-afk-scene">
        <div className="game-afk-scene__viewport game-afk-scene__viewport--loading">
          <span className="game-afk-scene__loading-spinner" aria-hidden />
          <p className="game-afk-scene__loading-text">Carregando vila...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-afk-scene">
      <div className="game-afk-scene__viewport game-afk-village">
        <button
          type="button"
          className="game-afk-village__building game-afk-village__building--shop"
          onClick={onOpenShop}
          aria-label="Abrir loja da Exploração"
          title="Loja"
        >
          <span className="game-afk-village__building-label">Loja</span>
          <div className="game-afk-village__building-shadow" aria-hidden />
          <img src="/assets/loja-da-vila.png" alt="" draggable={false} />
        </button>

        <button
          type="button"
          className="game-afk-village__building game-afk-village__building--museu"
          onClick={onOpenBestiary}
          aria-label="Abrir Bestiário"
          title="Bestiário"
        >
          <span className="game-afk-village__building-label">Bestiário</span>
          <div className="game-afk-village__building-shadow" aria-hidden />
          <img src="/assets/museu-da-vila-bestiario.png" alt="" draggable={false} />
          <span className="game-afk-village__building-count tabular-nums">
            {bestiaryUnlocked}/{bestiaryTotal}
          </span>
        </button>
      </div>

      <button type="button" className="game-afk-village__continue" onClick={onContinue}>
        Explorar Floresta
        <ArrowRight size={16} aria-hidden />
      </button>
    </div>
  );
}
