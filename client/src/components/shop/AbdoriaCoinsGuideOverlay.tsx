import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Coins, Gift, Store, Trophy, X, Zap } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import {
  ABDORIA_XP_STEP,
  CURRENCY_NAME,
  SHOP_ABDORIA_COST_PER_XP,
  SHOP_XP_COST_PER_ABDORIA,
} from '@/types';

const SLIDES = [
  {
    icon: Zap,
    title: 'Ganhe treinando',
    body: `Cada ${ABDORIA_XP_STEP} XP que você ganha vira 1 ${CURRENCY_NAME} automaticamente. Complete treinos, mantenha o streak e suba de nível para acumular mais.`,
  },
  {
    icon: Store,
    title: 'Loja diária',
    body: `Na tela principal, use a Loja diária para trocar ${SHOP_XP_COST_PER_ABDORIA} XP do seu nível por 1 ${CURRENCY_NAME}. Você também pode converter ${SHOP_ABDORIA_COST_PER_XP} ${CURRENCY_NAME} em 1 XP quando precisar.`,
  },
  {
    icon: Trophy,
    title: 'Ranking semanal',
    body: `Todo domingo, o top 25 da classificação por XP recebe ${CURRENCY_NAME}: 1º lugar 15 · 2º 10 · 3º 5 · do 4º ao 25º, 3 cada.`,
  },
  {
    icon: Gift,
    title: 'Bônus extras',
    body: `Conquistas e streaks dão XP extra — e esse XP também vira ${CURRENCY_NAME}. Fique de olho em códigos promocionais nas configurações.`,
  },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AbdoriaCoinsGuideOverlay({ open, onClose }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const slide = SLIDES[step];
  const Icon = slide.icon;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-900/55 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="glass-panel-strong relative w-full max-w-md rounded-3xl p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="abdoria-coins-guide-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} className="absolute right-4 top-4 cursor-pointer text-stone-400" aria-label="Fechar">
          <X size={24} />
        </button>

        <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-amber-700">
          <Coins size={14} className="mr-1 inline" aria-hidden />
          Como ganhar {CURRENCY_NAME}
        </p>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Icon size={28} />
            </div>
            <h3 id="abdoria-coins-guide-title" className="text-xl font-extrabold text-stone-900">
              {slide.title}
            </h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-stone-600">{slide.body}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
            className="cursor-pointer disabled:opacity-30"
            aria-label="Dica anterior"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="text-sm font-bold text-stone-400">
            {step + 1}/{SLIDES.length}
          </span>
          {step < SLIDES.length - 1 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} className="cursor-pointer" aria-label="Próxima dica">
              <ChevronRight size={24} />
            </button>
          ) : (
            <GameButton onClick={onClose}>Entendi!</GameButton>
          )}
        </div>
      </motion.div>
    </div>
  );
}
