import { motion } from 'framer-motion';

export interface CosmeticEffectLayerProps {
  effectId: string;
  active?: boolean;
  /** loop = preview da loja; burst = celebração única */
  mode?: 'loop' | 'burst';
  /** Prévia da loja — partículas maiores, mais rápidas e legíveis */
  preview?: boolean;
  className?: string;
}

const CONFETE = ['#059669', '#34d399', '#fbbf24', '#38bdf8', '#a78bfa', '#f472b6', '#22d3ee', '#fde047', '#fb7185', '#4ade80'];
const PADRAO = ['#34d399', '#059669', '#fbbf24', '#fef9c3', '#6ee7b7', '#fcd34d', '#10b981'];
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

function loopGap(mode: 'loop' | 'burst', preview: boolean, seconds: number) {
  if (mode !== 'loop') return 0;
  return preview ? seconds * 0.3 : seconds;
}

function particleBottom(preview: boolean) {
  return preview ? '36%' : '22%';
}

export function CosmeticEffectLayer({
  effectId,
  active = true,
  mode = 'loop',
  preview = false,
  className = '',
}: CosmeticEffectLayerProps) {
  if (!active) return null;

  const loop = repeat(mode);
  const rootClass = [
    'game-cosmetic-effect',
    preview ? 'game-cosmetic-effect--shop-preview' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (effectId === 'efeito_glitch') {
    const blockCount = preview ? 56 : 48;
    return (
      <div className={`${rootClass} game-cosmetic-effect--glitch`} aria-hidden>
        <motion.div
          className="game-cosmetic-effect__glitch-scan"
          animate={{ y: ['-120%', '220%'] }}
          transition={{
            duration: burstDuration(mode, preview ? 1.6 : 2.4),
            repeat: loop,
            ease: 'linear',
          }}
        />
        <motion.div
          className="game-cosmetic-effect__glitch-vignette"
          animate={{ opacity: [0.35, 0.85, 0.35] }}
          transition={{ duration: 0.28, repeat: loop, repeatType: 'mirror' }}
        />
        {Array.from({ length: blockCount }).map((_, i) => (
          <motion.span
            key={`g-${i}`}
            className="game-cosmetic-effect__glitch-block"
            style={{
              top: `${(i * 9) % 94}%`,
              left: `${(i * 17) % 92}%`,
              width: `${(preview ? 12 : 8) + (i % 5) * (preview ? 8 : 6)}px`,
              backgroundColor: GLITCH[i % GLITCH.length],
            }}
            initial={{ opacity: 0, x: 0, scaleX: 1 }}
            animate={{
              opacity: [0, 1, 0.15, 1, 0],
              x: [0, (i % 2 === 0 ? 18 : -18), 0, (i % 2 === 0 ? -10 : 10), 0],
              scaleX: [1, 2.2, 0.5, 1.6, 1],
            }}
            transition={{
              duration: 0.42,
              delay: i * 0.02,
              repeat: loop,
              repeatDelay: loopGap(mode, preview, 0.55),
            }}
          />
        ))}
      </div>
    );
  }

  if (effectId === 'efeito_agua') {
    const dropCount = preview ? 28 : 24;
    return (
      <div className={`${rootClass} game-cosmetic-effect--agua`} aria-hidden>
        {Array.from({ length: preview ? 8 : 6 }).map((_, i) => (
          <motion.span
            key={`ring-${i}`}
            className="game-cosmetic-effect__water-ring"
            style={{ left: `${6 + i * 11}%`, borderColor: AGUA[i % AGUA.length] }}
            initial={{ opacity: 0.75, scale: 0.15 }}
            animate={{ opacity: [0.75, 0], scale: [0.15, preview ? 3.4 : 2.8] }}
            transition={{
              duration: 1.35,
              delay: i * 0.16,
              repeat: loop,
              repeatDelay: loopGap(mode, preview, 0.35),
            }}
          />
        ))}
        {Array.from({ length: dropCount }).map((_, idx) => (
          <motion.span
            key={`drop-${idx}`}
            className="game-cosmetic-effect__water-drop"
            style={{ backgroundColor: AGUA[idx % AGUA.length], left: `${3 + idx * 3.4}%` }}
            initial={{ opacity: 0.95, y: preview ? -18 : -12, scale: 1 }}
            animate={{
              opacity: [0.95, 0.55, 0],
              y: [0, 58 + (idx % 6) * 12, preview ? 110 : 90],
              x: [(idx % 2 === 0 ? -1 : 1) * (8 + (idx % 4) * 4)],
              scale: [1, 0.8, 0.2],
            }}
            transition={{
              duration: burstDuration(mode, preview ? 1.1 : 1.35),
              delay: idx * 0.035,
              repeat: loop,
              repeatDelay: loopGap(mode, preview, 0.2),
            }}
          />
        ))}
      </div>
    );
  }

  if (effectId === 'efeito_raios') {
    const boltCount = preview ? 24 : 18;
    return (
      <div className={`${rootClass} game-cosmetic-effect--raios`} aria-hidden>
        <motion.div
          className="game-cosmetic-effect__lightning-flash"
          animate={{ opacity: [0, 0.95, 0, 0.65, 0] }}
          transition={{ duration: 0.38, repeat: loop, repeatDelay: loopGap(mode, preview, 0.65) }}
        />
        {Array.from({ length: boltCount }).map((_, idx) => (
          <motion.span
            key={`bolt-${idx}`}
            className="game-cosmetic-effect__bolt"
            style={{
              backgroundColor: RAIOS[idx % RAIOS.length],
              left: `${4 + idx * 4.1}%`,
              height: `${(preview ? 36 : 28) + (idx % 5) * 14}px`,
            }}
            initial={{ opacity: 0, scaleY: 0.1, rotate: -10 + (idx % 4) * 6 }}
            animate={{
              opacity: [0, 1, 0.25, 1, 0],
              scaleY: [0.1, 1.35, 0.45, 1.1, 0.2],
              rotate: [-10 + (idx % 4) * 6, 8 - (idx % 3) * 5, -6],
            }}
            transition={{
              duration: 0.36,
              delay: idx * 0.04,
              repeat: loop,
              repeatDelay: loopGap(mode, preview, 0.7),
            }}
          />
        ))}
      </div>
    );
  }

  if (effectId === 'efeito_fogo') {
    const emberCount = preview ? 36 : 28;
    return (
      <div className={`${rootClass} game-cosmetic-effect--fogo`} aria-hidden>
        <motion.div
          className="game-cosmetic-effect__fire-glow"
          animate={{ opacity: [0.4, 0.92, 0.4], scale: [0.88, 1.14, 0.88] }}
          transition={{ duration: 0.65, repeat: loop, repeatType: 'mirror' }}
        />
        {Array.from({ length: emberCount }).map((_, idx) => (
          <motion.span
            key={`ember-${idx}`}
            className="game-cosmetic-effect__ember"
            style={{
              backgroundColor: FOGO[idx % FOGO.length],
              left: `${4 + idx * 2.7}%`,
              width: `${(preview ? 7 : 5) + (idx % 4)}px`,
              height: `${(preview ? 7 : 5) + (idx % 4)}px`,
              bottom: particleBottom(preview),
            }}
            initial={{ opacity: 0.95, y: 0, scale: 1 }}
            animate={{
              opacity: [0.95, 0.65, 0],
              y: [0, -56 - (idx % 7) * 14, -100 - idx],
              x: [(idx % 2 === 0 ? -1 : 1) * (12 + (idx % 5) * 5)],
              scale: [1, 1.45, 0.15],
            }}
            transition={{
              duration: burstDuration(mode, preview ? 0.95 : 1.2),
              delay: idx * 0.028,
              repeat: loop,
              repeatDelay: loopGap(mode, preview, 0.25),
            }}
          />
        ))}
        {Array.from({ length: preview ? 16 : 12 }).map((_, i) => (
          <motion.span
            key={`flame-${i}`}
            className="game-cosmetic-effect__flame"
            style={{ left: `${5 + i * 5.8}%`, height: preview ? '24px' : '18px' }}
            animate={{ opacity: [0.55, 1, 0.35], scaleY: [0.65, 1.35, 0.75], scaleX: [0.85, 1.15, 0.9] }}
            transition={{ duration: 0.48, delay: i * 0.05, repeat: loop, repeatType: 'mirror' }}
          />
        ))}
      </div>
    );
  }

  if (effectId === 'efeito_padrao') {
    const sparkCount = preview ? 22 : 14;
    return (
      <div className={`${rootClass} game-cosmetic-effect--padrao`} aria-hidden>
        {[0, 1, 2].map((ring) => (
          <motion.div
            key={`ring-${ring}`}
            className="game-cosmetic-effect__padrao-ring"
            animate={{ scale: [0.35, preview ? 2.6 : 2.1], opacity: [0.7, 0] }}
            transition={{
              duration: preview ? 1.1 : 1.35,
              delay: ring * 0.42,
              repeat: loop,
              repeatDelay: loopGap(mode, preview, 0.55),
            }}
          />
        ))}
        <motion.div
          className="game-cosmetic-effect__padrao-core"
          animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 0.9, repeat: loop, repeatType: 'mirror' }}
        />
        {Array.from({ length: sparkCount }).map((_, i) => {
          const angle = (i / sparkCount) * Math.PI * 2;
          const dist = preview ? 62 : 44;
          const isStar = i % 5 === 0;
          return (
            <motion.span
              key={i}
              className={[
                'game-cosmetic-effect__padrao-spark',
                isStar ? 'game-cosmetic-effect__padrao-spark--star' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                left: '50%',
                top: preview ? '46%' : '40%',
                color: PADRAO[i % PADRAO.length],
                backgroundColor: isStar ? undefined : PADRAO[i % PADRAO.length],
              }}
              initial={{ opacity: 0, scale: 0.2, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 0.85, 0],
                scale: [0.2, preview ? 1.35 : 1.15, 0.5],
                x: [0, Math.cos(angle) * dist, Math.cos(angle) * dist * 1.1],
                y: [0, Math.sin(angle) * dist * 0.65, Math.sin(angle) * dist * 0.8],
              }}
              transition={{
                duration: preview ? 0.95 : 1.1,
                delay: i * 0.035,
                repeat: loop,
                repeatDelay: loopGap(mode, preview, 0.65),
                ease: 'easeOut',
              }}
            />
          );
        })}
      </div>
    );
  }

  if (effectId === 'efeito_confete') {
    const isRain = preview && mode === 'loop';
    const count = preview ? (isRain ? 52 : 64) : 56;

    return (
      <div className={`${rootClass} game-cosmetic-effect--confete`} aria-hidden>
        {!isRain && (
          <motion.div
            className="game-cosmetic-effect__confetti-burst"
            animate={{ opacity: [0.25, 0.7, 0.25], scale: [0.8, 1.15, 0.8] }}
            transition={{ duration: 0.95, repeat: loop, repeatType: 'mirror' }}
          />
        )}
        {Array.from({ length: count }).map((_, i) => {
          const isRect = i % 3 !== 0;
          const isStar = !isRect && i % 5 === 0;
          const color = CONFETE[i % CONFETE.length];
          return (
            <motion.span
              key={i}
              className={[
                'game-cosmetic-effect__piece',
                isRect ? 'game-cosmetic-effect__piece--rect' : '',
                isStar ? 'game-cosmetic-effect__piece--star' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                color,
                borderBottomColor: color,
                backgroundColor: isRect || (!isStar && !isRect) ? color : undefined,
                left: `${(i * 7.1) % 97}%`,
                top: isRain ? `${-8 - (i % 5) * 4}%` : undefined,
                bottom: isRain ? undefined : particleBottom(preview),
                width: isRect ? undefined : isStar ? undefined : `${preview ? 6 : 4}px`,
                height: isRect ? undefined : isStar ? undefined : `${preview ? 6 : 4}px`,
              }}
              initial={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
              animate={
                isRain
                  ? {
                      opacity: [1, 1, 0.85, 0],
                      y: [0, 95 + (i % 6) * 12, 130 + (i % 4) * 8],
                      x: [(i % 2 === 0 ? -1 : 1) * (6 + (i % 7) * 3), (i % 2 === 0 ? 1 : -1) * (4 + (i % 5) * 2)],
                      rotate: [0, 180 + i * 32, 360 + i * 20],
                      scale: [1, 1.1, 0.85],
                    }
                  : {
                      opacity: [1, 1, 0],
                      y: [0, -64 - (i % 8) * 16, -130 - (i % 6) * 12],
                      x: [(i % 2 === 0 ? -1 : 1) * (16 + (i % 9) * 7)],
                      rotate: 220 + i * 34,
                      scale: [1, preview ? 1.35 : 1.25, 0.35],
                    }
              }
              transition={{
                duration: isRain ? 1.5 + (i % 4) * 0.12 : burstDuration(mode, preview ? 1.2 : 1.5),
                delay: isRain ? (i % 14) * 0.055 : i * 0.022,
                repeat: loop,
                repeatDelay: loopGap(mode, preview, isRain ? 0.05 : 0.85),
                ease: 'easeOut',
              }}
            />
          );
        })}
      </div>
    );
  }

  return null;
}
