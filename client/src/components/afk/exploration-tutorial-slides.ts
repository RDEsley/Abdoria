import { Gift, Sword, TreePine } from 'lucide-react';
import type { TutorialSlide } from '@/components/tutorial/TutorialOverlay';

/** Chave local — tutorial específico da Exploração é único por dispositivo,
    separado do `preferencias.tutorial_visto` (onboarding geral, no servidor). */
export const EXPLORATION_TUTORIAL_KEY = 'abdoria_exploracao_tutorial_visto';

// O tutorial geral ensina onde fica o botão de entrada. Aqui começa a
// orientação sobre os controles internos da Exploração.
export const EXPLORATION_TUTORIAL_SLIDES: readonly TutorialSlide[] = [
  {
    icon: TreePine,
    title: 'Bem-vindo à vila',
    body: 'Você chegou pelo botão de espadas da Home. Na vila ficam a Loja, o Bestiário e a Árvore de Habilidades. Quando quiser partir, toque em “Começar a aventura”.',
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
