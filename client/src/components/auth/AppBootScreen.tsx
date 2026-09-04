import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { APP_BOOT_MARK_SRC } from '@/lib/brand';

const BOOT_PHRASES = [
  'Plantando a sua evolução.',
  'Pequenos passos criam raízes.',
  'Seu progresso está crescendo.',
  'Preparando o seu próximo passo.',
  'Constância também se cultiva.',
  'Mais um dia para florescer.',
] as const;

const PHRASE_INTERVAL_MS = 3000;

/** Loading inicial exclusivo da abertura do app — não substitui loaders internos. */
export function AppBootScreen() {
  const reduceMotion = Boolean(useReducedMotion());
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const id = window.setInterval(() => {
      setPhraseIndex((current) => (current + 1) % BOOT_PHRASES.length);
    }, PHRASE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const phrase = BOOT_PHRASES[phraseIndex] ?? BOOT_PHRASES[0];

  return (
    <div
      className="app-boot-screen"
      role="status"
      aria-live="polite"
      aria-label="Carregando Evolyn"
    >
      <div className="app-boot-screen__glow" aria-hidden />
      <div className="app-boot-screen__mark-wrap">
        <img
          src={APP_BOOT_MARK_SRC}
          alt=""
          className="app-boot-screen__mark"
          width={128}
          height={128}
        />
      </div>
      <p className="app-boot-screen__tagline" key={phrase}>
        {phrase}
      </p>
    </div>
  );
}
