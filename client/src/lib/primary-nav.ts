import { CalendarCheck2, Dumbbell, Home, Sprout, Utensils, type LucideIcon } from 'lucide-react';

export interface PrimaryNavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

/** Ordem do menu inferior — swipe horizontal navega nesta sequência. */
export const PRIMARY_NAV_ITEMS: readonly PrimaryNavItem[] = [
  { to: '/', icon: Home, label: 'Início' },
  { to: '/atividades', icon: CalendarCheck2, label: 'Atividades' },
  { to: '/treino', icon: Dumbbell, label: 'Treino' },
  { to: '/myplant', icon: Sprout, label: 'MyPlant' },
  { to: '/alimentacao', icon: Utensils, label: 'Alimentação' },
];

export function primaryNavIndex(pathname: string): number {
  if (pathname === '/') return 0;
  return PRIMARY_NAV_ITEMS.findIndex((item) => item.to !== '/' && pathname === item.to);
}
