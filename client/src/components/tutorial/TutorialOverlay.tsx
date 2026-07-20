import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coins,
  Compass,
  Dumbbell,
  Flame,
  ListChecks,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { playClick, playCompleteSet } from '@/lib/sounds';

// Ordem intencional: primeiro o que o app É (treino, missão diária,
// atividade no descanso, calendário) — só depois a camada de jogo (XP,
// moedas, exploração, ranking). Quem entende o app usa melhor o jogo.
const SLIDES = [
  {
    icon: Dumbbell,
    title: 'Bem-vindo ao Abdoria',
    body: 'Um app de treino de abdômen de verdade — com aquecimento guiado, evolução real e um pouco de RPG pra deixar o hábito mais gostoso de manter.',
  },
  {
    icon: Target,
    title: 'Sua missão diária',
    body: 'A Home sempre sugere o treino do dia. Toque em Jogar e siga no seu ritmo — por repetições ou por tempo, você escolhe.',
  },
  {
    icon: ListChecks,
    title: 'Dia de descanso tem Atividade',
    body: 'Sem treino hoje? Escolha Atividades como leitura, corrida ou meditação na Home — elas mantêm sua sequência sem pular o descanso.',
  },
  {
    icon: CalendarDays,
    title: 'Tudo fica no calendário',
    body: 'Treinos, atividades e observações do dia ficam salvos — dá pra olhar pra trás e ver sua evolução a qualquer momento.',
  },
  {
    icon: Flame,
    title: 'XP e sequência',
    body: 'Cada treino ou Atividade concluída rende XP e mantém sua sequência de dias viva. O contador de XP zera à meia-noite.',
  },
  {
    icon: Coins,
    title: 'Moedas e personalização',
    body: 'Ganhe Moedas treinando e use na aba Áudio pra desbloquear pacotes de som. Molduras e títulos vêm de conquistas, códigos e eventos.',
  },
  {
    icon: Compass,
    title: 'Exploração AFK',
    body: 'Sua patrulha explora sozinha em segundo plano e traz recompensas — dá uma olhada de vez em quando pra coletar o que achou.',
  },
  {
    icon: Trophy,
    title: 'Suba no ranking',
    body: 'Dispute a Arena semanal de XP e Moedas contra outros jogadores e mantenha sua sequência de dias no topo.',
  },
] as const;

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
  const isLast = step === SLIDES.length - 1;

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
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Pular tutorial"
          className="absolute right-4 top-4 cursor-pointer text-stone-400 hover:text-stone-600"
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
            <h3 className="text-xl font-extrabold text-stone-900">{Slide.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">{Slide.body}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-5 flex items-center justify-center gap-1.5">
          {SLIDES.map((_, i) => (
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
            {step + 1}/{SLIDES.length}
          </span>
          {isLast ? (
            <GameButton onClick={next}>Entendi!</GameButton>
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
