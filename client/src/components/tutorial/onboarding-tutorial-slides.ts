import {
  CalendarDays,
  Dumbbell,
  Flame,
  Leaf,
  ListChecks,
  Sprout,
  Target,
  Trophy,
} from 'lucide-react';
import type { TutorialSlide } from '@/components/tutorial/TutorialOverlay';

// A apresentação começa pela rotina e depois explica a progressão gamificada.
export const ONBOARDING_TUTORIAL_SLIDES: readonly TutorialSlide[] = [
  {
    icon: Dumbbell,
    title: 'Bem-vindo ao Evolyn',
    body: 'Treinos, atividades e organização pessoal em uma experiência gamificada que valoriza sua constância.',
  },
  {
    icon: Target,
    title: 'Seu treino do dia',
    body: 'A tela inicial sugere o treino do dia. Cada exercício pode ser configurado diretamente na fila de Treino.',
  },
  {
    icon: ListChecks,
    title: 'Atividades em um só lugar',
    body: 'Em Atividades você organiza sua rotina e mantém a sequência até nos dias de descanso.',
  },
  {
    icon: CalendarDays,
    title: 'Tudo fica no calendário',
    body: 'Treinos, atividades e observações ficam salvos no Mapa de atividades para você acompanhar sua evolução.',
  },
  {
    icon: Flame,
    title: 'XP e sequência',
    body: 'Cada treino ou Atividade concluída rende XP e mantém sua sequência de dias viva. O contador de XP zera à meia-noite.',
  },
  {
    icon: Leaf,
    title: 'Folhas e personalização',
    body: 'Ganhe Folhas treinando e use na aba Áudio pra desbloquear pacotes de som. Molduras e títulos vêm de conquistas, códigos e eventos.',
  },
  {
    icon: Sprout,
    title: 'MyPlant está crescendo',
    body: 'Acesse MyPlant pela barra principal. Uma experiência totalmente nova chegará em breve.',
  },
  {
    icon: Trophy,
    title: 'Suba no ranking',
    body: 'Dispute a Arena semanal de XP e Folhas contra outros jogadores e mantenha sua sequência de dias no topo.',
  },
];
