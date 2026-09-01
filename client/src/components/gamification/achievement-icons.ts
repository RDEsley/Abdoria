import type { AchievementIcon } from '@/types';
import {
  IconBarbell,
  IconBolt,
  IconCalendar,
  IconClock,
  IconCrown,
  IconDroplet,
  IconFlame,
  IconHeart,
  IconLeaf,
  IconMedal,
  IconMoon,
  IconRocket,
  IconShield,
  IconSnowflake,
  IconSparkles,
  IconStar,
  IconSun,
  IconTarget,
  IconTrophy,
  type Icon,
} from '@tabler/icons-react';

/** Mapa único de ícone → componente Tabler — fonte compartilhada por conquistas,
    atividades e cosméticos. */
export const ACHIEVEMENT_ICON_COMPONENTS: Record<AchievementIcon, Icon> = {
  medal: IconMedal,
  flame: IconFlame,
  trophy: IconTrophy,
  zap: IconBolt,
  star: IconStar,
  target: IconTarget,
  crown: IconCrown,
  sun: IconSun,
  moon: IconMoon,
  calendar: IconCalendar,
  clock: IconClock,
  'golden-leaf': IconLeaf,
  rocket: IconRocket,
  dumbbell: IconBarbell,
  heart: IconHeart,
  shield: IconShield,
  droplet: IconDroplet,
  sparkles: IconSparkles,
  snowflake: IconSnowflake,
};

/** Cor do medalhão quando desbloqueada — uma por ícone, escolhida pelo que o
    ícone já evoca (chama = laranja, coração = rosa, lua = índigo etc.), não
    por categoria de conquista. Bloqueada continua neutra (prata) pra todas —
    a cor só "acende" ao desbloquear. */
export const ACHIEVEMENT_ICON_TONES: Record<AchievementIcon, { mid: string; dark: string }> = {
  medal: { mid: '#fbbf24', dark: '#d97706' },
  flame: { mid: '#fb923c', dark: '#c2410c' },
  trophy: { mid: '#facc15', dark: '#a16207' },
  zap: { mid: '#a78bfa', dark: '#6d28d9' },
  star: { mid: '#38bdf8', dark: '#0369a1' },
  target: { mid: '#fb7185', dark: '#be123c' },
  crown: { mid: '#c084fc', dark: '#7e22ce' },
  sun: { mid: '#fcd34d', dark: '#b45309' },
  moon: { mid: '#818cf8', dark: '#4338ca' },
  calendar: { mid: '#2dd4bf', dark: '#0f766e' },
  clock: { mid: '#22d3ee', dark: '#0e7490' },
  'golden-leaf': { mid: '#fbbf24', dark: '#b45309' },
  rocket: { mid: '#60a5fa', dark: '#1d4ed8' },
  dumbbell: { mid: '#a8a29e', dark: '#57534e' },
  heart: { mid: '#f472b6', dark: '#be185d' },
  shield: { mid: '#34d399', dark: '#047857' },
  droplet: { mid: '#38bdf8', dark: '#0369a1' },
  sparkles: { mid: '#e879f9', dark: '#a21caf' },
  snowflake: { mid: '#7dd3fc', dark: '#0369a1' },
};
