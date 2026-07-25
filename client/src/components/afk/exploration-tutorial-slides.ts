import { Gift, Sword, TreePine } from 'lucide-react';
import type { TutorialSlide } from '@/components/tutorial/TutorialOverlay';

/** Chave local — tutorial específico da Exploração é único por dispositivo,
    separado do `preferencias.tutorial_visto` (onboarding geral, no servidor). */
export const EXPLORATION_TUTORIAL_KEY = 'abdoria_exploracao_tutorial_visto';

// Só o que é específico DESTA tela — o tutorial geral já apresenta o
// conceito de exploração em segundo plano, sem redundância aqui.
export const EXPLORATION_TUTORIAL_SLIDES: readonly TutorialSlide[] = [
  {
    icon: TreePine,
    title: 'Bem-vindo à vila',
    body: 'Aqui ficam a loja de equipamentos e o museu com o bestiário — toque nos dois prédios pra abrir. Quando quiser partir, toque em "Explorar".',
  },
  {
    icon: Sword,
    title: 'Sua patrulha luta sozinha',
    body: 'Na floresta, ela enfrenta slimes automaticamente. O tempo acumulado embaixo mede o quanto já explorou — até 24h de cada vez. Toque no ícone ao lado do título pra voltar à vila quando quiser.',
  },
  {
    icon: Gift,
    title: 'Colete o baú de recompensas',
    body: 'Cada inimigo derrotado pode deixar loot. Quando o baú estiver pronto, toque em Coletar pra guardar tudo — Coins, itens e às vezes algo raro.',
  },
];
