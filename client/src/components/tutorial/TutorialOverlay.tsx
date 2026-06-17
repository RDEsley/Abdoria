import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Zap, Trophy, Play, Target } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';

const SLIDES = [
  { icon: Zap, title: 'Ganhe pontos (XP)', body: 'Complete séries e treinos para ganhar pontos. Você pode ganhar até 100 pontos por dia; o contador zera à meia-noite.' },
  { icon: Target, title: 'Tipos de treino', body: 'Escolha treinos prontos ou monte o seu: abdômen superior, oblíquos, inferior, core ou completo. As sugestões seguem o seu nível.' },
  { icon: Play, title: 'Durante o treino', body: 'Você começa cada série quando estiver pronto e marca quando terminar. Alguns exercícios são por repetições, outros por tempo.' },
  { icon: Trophy, title: 'Classificação', body: 'Veja como você está em relação a outros atletas na aba Arena, por pontos ou por dias seguidos treinando.' },
  { icon: Zap, title: 'Conquistas', body: 'Desbloqueie medalhas quando mantiver a rotina, treinar com frequência e variar os músculos trabalhados.' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TutorialOverlay({ open, onClose }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const Slide = SLIDES[step];
  const Icon = Slide.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm">
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-panel-strong relative w-full max-w-md rounded-3xl p-6">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 cursor-pointer text-stone-400">
          <X size={24} />
        </button>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <Icon size={28} />
            </div>
            <h3 className="text-xl font-extrabold text-stone-900">{Slide.title}</h3>
            <p className="mt-2 text-stone-600">{Slide.body}</p>
          </motion.div>
        </AnimatePresence>
        <div className="mt-6 flex items-center justify-between">
          <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="cursor-pointer disabled:opacity-30">
            <ChevronLeft size={24} />
          </button>
          <span className="text-sm font-bold text-stone-400">{step + 1}/{SLIDES.length}</span>
          {step < SLIDES.length - 1 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} className="cursor-pointer">
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
