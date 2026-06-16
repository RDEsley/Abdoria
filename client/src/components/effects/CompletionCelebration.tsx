import { motion } from 'framer-motion';

const COLORS = ['#059669', '#34d399', '#fbbf24', '#38bdf8', '#a78bfa'];

export function CompletionCelebration() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-3 w-3 rounded-sm"
          style={{ backgroundColor: COLORS[i % COLORS.length], left: `${(i * 17) % 100}%`, top: '40%' }}
          initial={{ opacity: 1, y: 0, rotate: 0 }}
          animate={{
            opacity: [1, 1, 0],
            y: [0, -120 - (i % 5) * 40],
            x: [(i % 2 === 0 ? -1 : 1) * (20 + i * 8)],
            rotate: 360,
          }}
          transition={{ duration: 1.8, delay: i * 0.04, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}
