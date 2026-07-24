import { Gift, Sword, TreePine } from 'lucide-react';
import type { TutorialSlide } from '@/components/tutorial/TutorialOverlay';

/** Chave local — tutorial específico da Exploração é único por dispositivo,
    separado do `preferencias.tutorial_visto` (onboarding geral, no servidor). */
export const EXPLORATION_TUTORIAL_KEY = 'abdoria_exploracao_tutorial_visto';

// Só o que é específico DESTA tela — o tutorial geral já apresenta o
// conceito de exploração em segundo plano, sem redundância aqui.
export const EXPLORATION_TUTORIAL_SLIDES: readonly TutorialSlide[] = [
  {
    icon: Sword,
    title: 'Sua patrulha luta sozinha',
    body: 'A cena de combate mostra sua patrulha enfrentando slimes automaticamente. O tempo acumulado embaixo mede o quanto ela já explorou — até 24h de cada vez.',
  },
  {
    icon: TreePine,
    title: 'Volte à vila quando quiser',
    body: 'Toque no ícone ao lado do título pra ir até a vila: lá tem a loja de equipamentos e o bestiário. Toque em "Continuar Explorando" pra voltar pro combate.',
  },
  {
    icon: Gift,
    title: 'Colete o baú de recompensas',
    body: 'Cada inimigo derrotado pode deixar loot. Quando o baú estiver pronto, toque em Coletar pra guardar tudo — Coins, itens e às vezes algo raro.',
  },
];
