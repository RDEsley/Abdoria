import { motion } from 'framer-motion';

export interface CosmeticEffectLayerProps {
  effectId: string;
  active?: boolean;
  /** loop = preview da loja; burst = celebração única */
  mode?: 'loop' | 'burst';
  className?: string;
}

const CONFETE = ['#059669', '#34d399', '#fbbf24', '#38bdf8', '#a78bfa', '#f472b6', '#22d3ee', '#fde047', '#fb7185', '#4ade80'];
const FOGO = ['#f97316', '#fb923c', '#ef4444', '#fbbf24', '#dc2626', '#fde047', '#ea580c'];
const RAIOS = ['#fde047', '#facc15', '#fef08a', '#fff', '#a5f3fc', '#fef9c3'];
const AGUA = ['#38bdf8', '#0ea5e9', '#22d3ee', '#67e8f9', '#bae6fd', '#7dd3fc', '#06b6d4'];
const GLITCH = ['#22d3ee', '#f472b6', '#fde047', '#a78bfa', '#4ade80', '#fb7185'];

function repeat(mode: 'loop' | 'burst') {
  return mode === 'loop' ? Infinity : 0;
}

function burstDuration(mode: 'loop' | 'burst', loopSeconds: number) {
  return mode === 'burst' ? loopSeconds : loopSeconds;
}

export function CosmeticEffectLayer({
  effectId,
  active = true,
  mode = 'loop',
  className = '',
}: CosmeticEffectLayerProps) {
  if (!active) return null;

  const loop = repeat(mode);
  const rootClass = `game-cosmetic-effect${className ? ` ${className}` : ''}`;

  if (effectId === 'efeito_glitch') {
    return (
      <div className={`${rootClass} game-cosmetic-effect--glitch`} aria-hidden>
        <motion.div
          className="game-cosmetic-effect__glitch-scan"
          animate={{ y: ['-120%', '220%'] }}
          transition={{ duration: burstDuration(mode, 2.4), repeat: loop, ease: 'linear' }}
        />
        <motion.div
          className="game-cosmetic-effect__glitch-vignette"
          animate={{ opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 0.35, repeat: loop, repeatType: 'mirror' }}
        />
        {Array.from({ length: 48 }).map((_, i) => (
          <motion.span
            key={`g-${i}`}
            className="game-cosmetic-effect__glitch-block"
            style={{
              top: `${(i * 11) % 94}%`,
              left: `${(i * 19) % 92}%`,
              width: `${8 + (i % 5) * 6}px`,
              backgroundColor: GLITCH[i % GLITCH.length],
            }}
            initial={{ opacity: 0, x: 0, scaleX: 1 }}
            animate={{
              opacity: [0, 1, 0.15, 1, 0],
              x: [0, (i % 2 === 0 ? 14 : -14), 0, (i % 2 === 0 ? -8 : 8), 0],
              scaleX: [1, 1.8, 0.6, 1.4, 1],
            }}
            transition={{ duration: 0.5, delay: i * 0.025, repeat: loop, repeatDelay: mode === 'loop' ? 0.6 : 0 }}
          />
        ))}
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.span
            key={`t-${i}`}
            className="game-cosmetic-effect__glitch-tear"
            style={{ top: `${(i * 17) % 100}%`, left: `${(i * 23) % 88}%` }}
            animate={{ opacity: [0, 1, 0], scaleX: [0.2, 2.4, 0.1] }}
            transition={{ duration: 0.28, delay: i * 0.05, repeat: loop, repeatDelay: mode === 'loop' ? 0.9 : 0 }}
          />
        ))}
      </div>
    );
  }

  if (effectId === 'efeito_agua') {
    return (
      <div className={`${rootClass} game-cosmetic-effect--agua`} aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.span
            key={`ring-${i}`}
            className="game-cosmetic-effect__water-ring"
            style={{ left: `${10 + i * 14}%`, borderColor: AGUA[i % AGUA.length] }}
            initial={{ opacity: 0.7, scale: 0.2 }}
            animate={{ opacity: [0.7, 0], scale: [0.2, 2.8] }}
            transition={{ duration: 1.6, delay: i * 0.22, repeat: loop, repeatDelay: mode === 'loop' ? 0.4 : 0 }}
          />
        ))}
        {AGUA.flatMap((color, i) =>
          Array.from({ length: 4 }).map((_, j) => {
            const idx = i * 4 + j;
            return (
              <motion.span
                key={`drop-${idx}`}
                className="game-cosmetic-effect__water-drop"
                style={{ backgroundColor: color, left: `${4 + idx * 5.5}%` }}
                initial={{ opacity: 0.95, y: -12, scale: 1 }}
                animate={{
                  opacity: [0.95, 0.5, 0],
                  y: [0, 52 + (idx % 6) * 10, 90 + idx * 2],
                  x: [(idx % 2 === 0 ? -1 : 1) * (6 + (idx % 4) * 3)],
                  scale: [1, 0.75, 0.25],
                }}
                transition={{
                  duration: burstDuration(mode, 1.35),
                  delay: idx * 0.04,
                  repeat: loop,
                  repeatDelay: mode === 'loop' ? 0.25 : 0,
                }}
              />
            );
          }),
        )}
        {Array.from({ length: 18 }).map((_, i) => (
          <motion.span
            key={`spray-${i}`}
            className="game-cosmetic-effect__water-spray"
            style={{ backgroundColor: AGUA[i % AGUA.length], left: `${(i * 13) % 96}%` }}
            animate={{ opacity: [0, 1, 0], y: [8, -28 - (i % 5) * 8], scale: [0.4, 1.2, 0.2] }}
            transition={{ duration: 0.9, delay: i * 0.06, repeat: loop, repeatDelay: mode === 'loop' ? 0.5 : 0 }}
          />
        ))}
      </div>
    );
  }

  if (effectId === 'efeito_raios') {
    return (
      <div className={`${rootClass} game-cosmetic-effect--raios`} aria-hidden>
        <motion.div
          className="game-cosmetic-effect__lightning-flash"
          animate={{ opacity: [0, 0.85, 0, 0.55, 0] }}
          transition={{ duration: 0.45, repeat: loop, repeatDelay: mode === 'loop' ? 1.1 : 0 }}
        />
        {RAIOS.flatMap((color, i) =>
          Array.from({ length: 3 }).map((_, j) => {
            const idx = i * 3 + j;
            return (
              <motion.span
                key={`bolt-${idx}`}
                className="game-cosmetic-effect__bolt"
                style={{
                  backgroundColor: color,
                  left: `${6 + idx * 7}%`,
                  height: `${28 + (idx % 5) * 12}px`,
                }}
                initial={{ opacity: 0, scaleY: 0.1, rotate: -8 + (idx % 4) * 5 }}
                animate={{
                  opacity: [0, 1, 0.2, 1, 0],
                  scaleY: [0.1, 1.2, 0.5, 1, 0.3],
                  rotate: [-8 + (idx % 4) * 5, 6 - (idx % 3) * 4, -4],
                }}
                transition={{
                  duration: 0.42,
                  delay: idx * 0.05,
                  repeat: loop,
                  repeatDelay: mode === 'loop' ? 1.2 : 0,
                }}
              />
            );
          }),
        )}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.span
            key={`spark-${i}`}
            className="game-cosmetic-effect__spark"
            style={{ backgroundColor: RAIOS[i % RAIOS.length], left: `${(i * 17) % 94}%` }}
            animate={{ opacity: [0, 1, 0], y: [0, -40 - (i % 6) * 8], scale: [0.3, 1.4, 0.2] }}
            transition={{ duration: 0.55, delay: i * 0.04, repeat: loop, repeatDelay: mode === 'loop' ? 0.8 : 0 }}
          />
        ))}
      </div>
    );
  }

  if (effectId === 'efeito_fogo') {
    return (
      <div className={`${rootClass} game-cosmetic-effect--fogo`} aria-hidden>
        <motion.div
          className="game-cosmetic-effect__fire-glow"
          animate={{ opacity: [0.35, 0.8, 0.35], scale: [0.9, 1.08, 0.9] }}
          transition={{ duration: 0.8, repeat: loop, repeatType: 'mirror' }}
        />
        {FOGO.flatMap((color, i) =>
          Array.from({ length: 4 }).map((_, j) => {
            const idx = i * 4 + j;
            return (
              <motion.span
                key={`ember-${idx}`}
                className="game-cosmetic-effect__ember"
                style={{
                  backgroundColor: color,
                  left: `${5 + idx * 4.8}%`,
                  width: `${5 + (idx % 4)}px`,
                  height: `${5 + (idx % 4)}px`,
                }}
                initial={{ opacity: 0.95, y: 0, scale: 1 }}
                animate={{
                  opacity: [0.95, 0.6, 0],
                  y: [0, -48 - (idx % 7) * 12, -90 - idx],
                  x: [(idx % 2 === 0 ? -1 : 1) * (10 + (idx % 5) * 4)],
                  scale: [1, 1.3, 0.2],
                }}
                transition={{
                  duration: burstDuration(mode, 1.2),
                  delay: idx * 0.035,
                  repeat: loop,
                  repeatDelay: mode === 'loop' ? 0.35 : 0,
                }}
              />
            );
          }),
        )}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.span
            key={`flame-${i}`}
            className="game-cosmetic-effect__flame"
            style={{ left: `${8 + i * 7}%` }}
            animate={{ opacity: [0.5, 1, 0.3], scaleY: [0.7, 1.25, 0.8], scaleX: [0.9, 1.1, 0.95] }}
            transition={{ duration: 0.55, delay: i * 0.07, repeat: loop, repeatType: 'mirror' }}
          />
        ))}
      </div>
    );
  }

  const palette = effectId === 'efeito_confete' ? CONFETE : CONFETE;
  const count = effectId === 'efeito_confete' ? 56 : effectId === 'efeito_padrao' ? 28 : 40;

  return (
    <div className={`${rootClass} game-cosmetic-effect--confete`} aria-hidden>
      <motion.div
        className="game-cosmetic-effect__confetti-burst"
        animate={{ opacity: [0.2, 0.55, 0.2], scale: [0.85, 1.05, 0.85] }}
        transition={{ duration: 1.2, repeat: loop, repeatType: 'mirror' }}
      />
      {Array.from({ length: count }).map((_, i) => {
        const isStar = i % 5 === 0;
        return (
          <motion.span
            key={i}
            className={`game-cosmetic-effect__piece${isStar ? ' game-cosmetic-effect__piece--star' : ''}`}
            style={{
              color: palette[i % palette.length],
              borderBottomColor: palette[i % palette.length],
              left: `${(i * 13) % 96}%`,
              width: isStar ? undefined : `${4 + (i % 4)}px`,
              height: isStar ? undefined : `${4 + (i % 3)}px`,
            }}
            initial={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            animate={{
              opacity: [1, 1, 0],
              y: [0, -56 - (i % 8) * 14, -120 - (i % 6) * 10],
              x: [(i % 2 === 0 ? -1 : 1) * (12 + (i % 9) * 6)],
              rotate: 180 + i * 28,
              scale: [1, 1.25, 0.4],
            }}
            transition={{
              duration: burstDuration(mode, 1.5),
              delay: i * 0.028,
              repeat: loop,
              repeatDelay: mode === 'loop' ? 1.2 : 0,
              ease: 'easeOut',
            }}
          />
        );
      })}
    </div>
  );
}
