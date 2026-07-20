import { Plane } from 'lucide-react';

/**
 * Loader de transição de página: um avião cruza a cena, acelera pro modo
 * supersônico com um rastro colorido e some pela direita — depois volta
 * a entrar pela esquerda com a opacidade subindo do zero, em loop.
 */
export function PageLoader() {
  return (
    <div className="game-loader">
      <div className="game-loader-scene" aria-hidden>
        <span className="game-loader-trail" />
        <span className="game-loader-plane">
          <Plane size={22} strokeWidth={2.25} />
        </span>
      </div>
      <p className="game-loader__label">Carregando...</p>
    </div>
  );
}
