import { motion } from 'framer-motion';

interface Props {
  effectId: string;
  active?: boolean;
}

const CONFETE = ['#059669', '#34d399', '#fbbf24', '#38bdf8', '#a78bfa', '#f472b6'];
const FOGO = ['#f97316', '#fb923c', '#ef4444', '#fbbf24'];
const RAIOS = ['#fde047', '#facc15', '#fef08a'];

export function EffectPreview({ effectId, active = true }: Props) {
  if (!active) return null;

  if (effectId === 'efeito_raios') {
    return (
      <div className="game-shop-effect-preview game-shop-effect-preview--raios" aria-hidden>
        {RAIOS.map((color, i) => (
          <motion.span
            key={i}
            className="game-shop-effect-preview__bolt"
            style={{ backgroundColor: color, left: `${12 + i * 22}%` }}
            initial={{ opacity: 0, scaleY: 0.2 }}
            animate={{ opacity: [0, 1, 0], scaleY: [0.2, 1, 0.4] }}
            transition={{ duration: 0.55, delay: i * 0.08, repeat: Infinity, repeatDelay: 1.2 }}
          />
        ))}
      </div>
    );
  }

  if (effectId === 'efeito_fogo') {
    return (
      <div className="game-shop-effect-preview game-shop-effect-preview--fogo" aria-hidden>
        {FOGO.map((color, i) => (
          <motion.span
            key={i}
            className="game-shop-effect-preview__ember"
            style={{ backgroundColor: color, left: `${8 + i * 16}%` }}
            initial={{ opacity: 0.8, y: 0, scale: 1 }}
            animate={{ opacity: [0.8, 0], y: [-36 - i * 8], scale: [1, 0.4] }}
            transition={{ duration: 1.1, delay: i * 0.12, repeat: Infinity, repeatDelay: 0.4 }}
          />
        ))}
      </div>
    );
  }

  const palette = effectId === 'efeito_confete' ? CONFETE : CONFETE.slice(0, 4);

  return (
    <div className="game-shop-effect-preview" aria-hidden>
      {Array.from({ length: 10 }).map((_, i) => (
        <motion.span
          key={i}
          className="game-shop-effect-preview__piece"
          style={{ backgroundColor: palette[i % palette.length], left: `${(i * 19) % 92}%` }}
          initial={{ opacity: 1, y: 0, rotate: 0 }}
          animate={{
            opacity: [1, 1, 0],
            y: [0, -48 - (i % 4) * 14],
            x: [(i % 2 === 0 ? -1 : 1) * (8 + i * 4)],
            rotate: 180 + i * 30,
          }}
          transition={{ duration: 1.4, delay: i * 0.05, repeat: Infinity, repeatDelay: 1.5 }}
        />
      ))}
    </div>
  );
}
