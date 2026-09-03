import { EvolynSproutMark } from '@/components/auth/EvolynSproutMark';

/** Loading inicial exclusivo da abertura do app — não substitui loaders internos. */
export function AppBootScreen() {
  return (
    <div
      className="app-boot-screen"
      role="status"
      aria-live="polite"
      aria-label="Carregando Evolyn"
    >
      <div className="app-boot-screen__glow" aria-hidden />
      <div className="app-boot-screen__mark-wrap">
        <EvolynSproutMark play="still" className="app-boot-screen__sprout" />
      </div>
      <p className="app-boot-screen__tagline">Plantando a sua evolução.</p>
    </div>
  );
}
