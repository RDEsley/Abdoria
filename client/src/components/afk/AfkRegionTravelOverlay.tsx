import { motion } from 'framer-motion';
import { LockOpen, MapPin, Sparkles } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { AfkRegionDefinition } from '@/types';

interface Props {
  region: AfkRegionDefinition;
  mode?: 'travel' | 'unlocked';
}

export function AfkRegionTravelOverlay({ region, mode = 'travel' }: Props) {
  const unlocked = mode === 'unlocked';
  const style = {
    '--travel-accent': region.accent,
    '--travel-background': `url("${region.backgroundUrl}")`,
  } as CSSProperties;

  return (
    <motion.div
      className={`game-afk-region-travel${unlocked ? ' game-afk-region-travel--unlocked' : ''}`}
      style={style}
      role="status"
      aria-live="polite"
      aria-label={
        unlocked
          ? `Capítulo ${region.chapter} desbloqueado: ${region.name}`
          : `Viajando para ${region.name}`
      }
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
          {unlocked ? <LockOpen size={14} aria-hidden /> : <Sparkles size={13} aria-hidden />}
          {unlocked ? 'Novo capítulo desbloqueado' : 'Viagem em andamento'}
        </span>
        <strong>{region.name}</strong>
        <small>
          Capítulo {region.chapter} · {region.subtitle}
        </small>

        {unlocked ? (
          <motion.div
            className="game-afk-region-travel__unlock-seal"
            aria-hidden
            initial={{ scale: 0.4, rotate: -18, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 16, delay: 0.12 }}
          >
            <LockOpen size={30} />
          </motion.div>
        ) : (
          <div className="game-afk-region-travel__route" aria-hidden>
            <span className="game-afk-region-travel__origin" />
            <i />
            <span className="game-afk-region-travel__traveler">➜</span>
            <MapPin className="game-afk-region-travel__destination" size={26} />
          </div>
        )}
        <p>
          {unlocked
            ? 'A região foi liberada e adicionada ao mapa.'
            : 'Preparando cenário e encontro…'}
        </p>
      </motion.div>
    </motion.div>
  );
}
