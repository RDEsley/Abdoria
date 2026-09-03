import { APP_BOOT_MARK_SRC } from '@/lib/brand';

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
        <img src={APP_BOOT_MARK_SRC} alt="" className="app-boot-screen__mark" width={128} height={128} />
      </div>
      <p className="app-boot-screen__tagline">Plantando a sua evolução.</p>
    </div>
  );
}
