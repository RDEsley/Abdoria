import { motion } from 'framer-motion';
import { LoadingMascot } from './LoadingMascot';

/**
 * Loader fantasma: uma silhueta fantasma + blocos em skeleton para dar
 * sensação de interface já montada enquanto o conteúdo termina de chegar.
 */
export function PageLoader() {
  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <div className="relative flex h-36 w-36 items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full bg-emerald-400/15 blur-2xl"
          animate={{ opacity: [0.45, 0.85, 0.45], scale: [0.96, 1.04, 0.96] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <LoadingMascot className="relative h-28 w-28" />
      </div>

      <div className="w-full max-w-md space-y-3 rounded-3xl border border-stone-200/80 bg-white/70 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <motion.div
          className="h-4 w-40 rounded-full bg-stone-200/90"
          animate={{ opacity: [0.45, 1, 0.45], scaleX: [0.98, 1, 0.98] }}
          transition={{ duration: 1.45, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="h-3 w-full rounded-full bg-stone-200/80"
          animate={{ opacity: [0.5, 0.95, 0.5] }}
          transition={{ duration: 1.25, repeat: Infinity, ease: 'easeInOut', delay: 0.08 }}
        />
        <motion.div
          className="h-3 w-5/6 rounded-full bg-stone-200/80"
          animate={{ opacity: [0.45, 0.9, 0.45] }}
          transition={{ duration: 1.25, repeat: Infinity, ease: 'easeInOut', delay: 0.16 }}
        />
        <div className="grid grid-cols-3 gap-3 pt-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <motion.span
              key={index}
              className="h-16 rounded-2xl bg-stone-200/75"
              animate={{ opacity: [0.4, 0.95, 0.4] }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: index * 0.12,
              }}
            />
          ))}
        </div>
      </div>

      <p className="text-sm font-bold tracking-wide text-stone-500">Carregando...</p>
    </div>
  );
}
