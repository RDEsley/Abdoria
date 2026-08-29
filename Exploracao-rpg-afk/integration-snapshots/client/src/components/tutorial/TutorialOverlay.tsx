import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, type LucideIcon } from 'lucide-react';
import { AfkFabSwords } from '@/components/afk/AfkFabSwords';
import { GameButton } from '@/components/ui/GameButton';
import { playClick, playCompleteSet } from '@/lib/sounds';

export interface TutorialSlide {
  icon: LucideIcon;
  title: string;
  body: string;
  spotlight?: 'rpg-fab';
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Slides do passo a passo — cada tela de tutorial passa a sua. */
  slides: readonly TutorialSlide[];
  /** Rótulo do botão final. */
  ctaLabel?: string;
  /** Permite que a tela destaque o controle real descrito pelo slide. */
  onSpotlightChange?: (spotlight: TutorialSlide['spotlight'] | null) => void;
}

export function TutorialOverlay({
  open,
  onClose,
  slides,
  ctaLabel = 'Entendi!',
  onSpotlightChange,
}: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    onSpotlightChange?.(open ? (slides[step]?.spotlight ?? null) : null);
  }, [onSpotlightChange, open, slides, step]);

  if (!open) return null;

  const Slide = slides[step];
  const Icon = Slide.icon;
  const isLast = step === slides.length - 1;

  const next = () => {
    if (isLast) {
      playCompleteSet();
      onClose();
      return;
    }
    playClick();
    setStep((s) => s + 1);
  };

  const prev = () => {
    if (step === 0) return;
    playClick();
    setStep((s) => s - 1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="glass-panel-strong relative w-full max-w-md rounded-3xl p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`tutorial-title-${step}`}
        aria-describedby={`tutorial-body-${step}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Pular tutorial"
          className="absolute right-3 top-3 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600"
        >
          <X size={24} />
        </button>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <Icon size={28} />
            </div>
            <h3 id={`tutorial-title-${step}`} className="text-xl font-extrabold text-stone-900">
              {Slide.title}
            </h3>
            <p id={`tutorial-body-${step}`} className="mt-2 text-sm leading-relaxed text-stone-600">
              {Slide.body}
            </p>
            {Slide.spotlight === 'rpg-fab' ? (
              <div
                className="tutorial-rpg-location"
                aria-label="Botão do RPG no canto inferior direito da Home"
              >
                <span className="tutorial-rpg-location__button" aria-hidden>
                  <AfkFabSwords />
                </span>
                <span className="tutorial-rpg-location__copy">
                  <strong>Botão do RPG</strong>
                  <small>Home · canto inferior direito</small>
                </span>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="mt-5 flex items-center justify-center gap-1.5">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-5 bg-emerald-500' : 'w-1.5 bg-stone-200'
              }`}
              aria-hidden
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            disabled={step === 0}
            onClick={prev}
            aria-label="Passo anterior"
            className="cursor-pointer text-stone-500 disabled:opacity-30"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="text-xs font-bold text-stone-400">
            {step + 1}/{slides.length}
          </span>
          {isLast ? (
            <GameButton onClick={next}>{ctaLabel}</GameButton>
          ) : (
            <button
              type="button"
              onClick={next}
              aria-label="Próximo passo"
              className="cursor-pointer text-stone-500 hover:text-stone-700"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
