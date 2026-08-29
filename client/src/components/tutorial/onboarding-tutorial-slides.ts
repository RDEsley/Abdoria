import {
  CalendarDays,
  Coins,
  Dumbbell,
  Flame,
  ListChecks,
  Sprout,
  Target,
  Trophy,
} from 'lucide-react';
import type { TutorialSlide } from '@/components/tutorial/TutorialOverlay';

// Ordem intencional: primeiro o que o app É (treino, missão diária,
// atividade no descanso, calendário) — só depois a camada de jogo (XP,
// moedas, MyPlant e ranking). Quem entende o app usa melhor a experiência.
export const ONBOARDING_TUTORIAL_SLIDES: readonly TutorialSlide[] = [
  {
    icon: Dumbbell,
    title: 'Bem-vindo ao Evolyn',
    body: 'Um app de treino de abdômen de verdade — com evolução real e um pouco de RPG pra deixar o hábito mais gostoso de manter.',
  },
  {
    icon: Target,
    title: 'Sua missão diária',
    body: 'A Home sugere o treino do dia. Toque em Iniciar treino; cada exercício pode ser configurado diretamente na fila da Missão.',
  },
  {
    icon: ListChecks,
    title: 'Atividades em um só lugar',
    body: 'No item Atividades da barra principal você organiza sua rotina, acompanha a campanha e mantém a sequência até nos dias de descanso.',
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
    icon: Coins,
    title: 'Moedas e personalização',
    body: 'Ganhe Moedas treinando e use na aba Áudio pra desbloquear pacotes de som. Molduras e títulos vêm de conquistas, códigos e eventos.',
  },
  {
    icon: Sprout,
    title: 'MyPlant está crescendo',
    body: 'Acesse MyPlant pela barra principal. Uma experiência totalmente nova chegará em breve.',
  },
  {
    icon: Trophy,
    title: 'Suba no ranking',
    body: 'Dispute a Arena semanal de XP e Moedas contra outros jogadores e mantenha sua sequência de dias no topo.',
  },
];
