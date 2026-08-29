import { motion } from 'framer-motion';
import { Leaf, Sparkles, Sprout } from 'lucide-react';

export function MyPlantPage() {
  return (
    <div className="flex min-h-[calc(100dvh-10rem)] items-center justify-center pb-20">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full overflow-hidden rounded-[2rem] border border-emerald-100 bg-white/90 px-6 py-12 text-center shadow-[0_24px_70px_rgba(16,185,129,0.12)] backdrop-blur-xl"
        aria-labelledby="myplant-title"
      >
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-100/70 blur-2xl" />
        <div className="absolute -bottom-10 -left-6 h-36 w-36 rounded-full bg-sky-100/70 blur-2xl" />

        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-200">
          <Sprout size={38} strokeWidth={2.2} aria-hidden />
          <Sparkles className="absolute -right-2 -top-2 text-amber-400" size={22} aria-hidden />
        </div>
        <p className="relative mt-6 text-[0.65rem] font-black uppercase tracking-[0.24em] text-emerald-700">
          Um novo espaço está crescendo
        </p>
        <h1
          id="myplant-title"
          className="relative mt-2 text-3xl font-black tracking-tight text-stone-900"
        >
          MyPlant
        </h1>
        <p className="relative mx-auto mt-3 max-w-sm text-sm font-semibold leading-relaxed text-stone-500">
          Em breve, uma nova experiência pensada para acompanhar sua evolução de um jeito leve, vivo
          e totalmente diferente.
        </p>
        <span className="relative mt-7 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-800">
          <Leaf size={15} aria-hidden /> Em breve
        </span>
      </motion.section>
    </div>
  );
}
