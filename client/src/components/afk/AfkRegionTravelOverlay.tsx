import { motion } from 'framer-motion';
import { MapPin, Sparkles } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { AfkRegionDefinition } from '@/types';

interface Props {
  region: AfkRegionDefinition;
}

export function AfkRegionTravelOverlay({ region }: Props) {
  const style = {
    '--travel-accent': region.accent,
    '--travel-background': `url("${region.backgroundUrl}")`,
  } as CSSProperties;

  return (
    <motion.div
      className="game-afk-region-travel"
      style={style}
      role="status"
      aria-live="polite"
      aria-label={`Viajando para ${region.name}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="game-afk-region-travel__backdrop" aria-hidden />
      <motion.div
        className="game-afk-region-travel__card"
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      >
        <span className="game-afk-region-travel__eyebrow">
          <Sparkles size={13} aria-hidden /> Viagem em andamento
        </span>
        <strong>{region.name}</strong>
        <small>
          Capítulo {region.chapter} · {region.subtitle}
        </small>

        <div className="game-afk-region-travel__route" aria-hidden>
          <span className="game-afk-region-travel__origin" />
          <i />
          <span className="game-afk-region-travel__traveler">➜</span>
          <MapPin className="game-afk-region-travel__destination" size={26} />
        </div>
        <p>Preparando cenário e encontro…</p>
      </motion.div>
    </motion.div>
  );
}
