import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { LoadingMascot } from '@/components/ui/LoadingMascot';

/**
 * Curiosidades sobre o sistema (Abdoria) e sobre saúde/treino, exibidas em
 * rodízio enquanto a sessão carrega — pura distração de espera, não afeta
 * gameplay. Pelo menos 15 pra não repetir rápido demais numa tela que some
 * em poucos segundos na maioria das vezes.
 */
const LOADING_TRIVIA: string[] = [
  'No Abdoria, sua sequência (streak) pode ser protegida por um Frozen Streak — ele impede que um dia perdido zere sua ofensiva.',
  'A Exploração continua rendendo XP e Coins mesmo com o app fechado, até o teto de 24h.',
  'O Bestiário guarda um registro de cada inimigo derrotado e os drops já descobertos dele.',
  'Molduras de perfil raras, como a Lendária, só são desbloqueadas por conquistas — nunca compradas.',
  'Séries de treino no Abdoria são 100% peso corporal: não existe campo de carga, só volume (séries × repetições ou tempo).',
  'O ranking semanal zera todo domingo, mas o ranking Global mostra seus totais vitalícios de sempre.',
  'Fazer aquecimento leve em dias de descanso também mantém sua streak viva.',
  'Armas e magias da Exploração têm raridades — de Comum até Secreto, passando pelo raríssimo Mítico.',
  'Treinar antes das 7h ou depois das 22h pode desbloquear conquistas escondidas.',
  'Dormir bem é tão importante quanto treinar: é durante o sono profundo que os músculos se recuperam e crescem.',
  'Beber água antes do treino melhora o desempenho — a desidratação leve já reduz sua força e resistência.',
  'Exercícios de peso corporal, como prancha e flexão, ativam múltiplos grupos musculares ao mesmo tempo.',
  'Manter uma sequência de treinos, mesmo curta, cria o hábito mais rápido do que treinos longos e esporádicos.',
  'Fortalecer o core melhora a postura e reduz dores lombares no dia a dia.',
  'Pequenas pausas ativas ao longo do dia ajudam tanto quanto um treino único e intenso.',
  'Respirar de forma controlada durante o exercício ajuda a manter a estabilidade do tronco.',
  'O Coelho Mágico da Exploração é a única fonte de magias novas — no máximo uma por dia.',
  'Alongar depois do treino ajuda na recuperação e reduz a rigidez muscular no dia seguinte.',
];

function useRotatingTrivia(intervalMs = 5000): string {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * LOADING_TRIVIA.length));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % LOADING_TRIVIA.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return LOADING_TRIVIA[index]!;
}

export function LoadingScreen() {
  const trivia = useRotatingTrivia();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <AnimatedBackground variant="app" />
      <motion.div
        className="relative z-10 flex w-full max-w-sm flex-col items-center gap-4 rounded-[2rem] border border-white/70 bg-white/75 p-6 text-center shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-sm"
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        <LoadingMascot className="h-28 w-28" />
        <div>
          <p className="text-base font-extrabold text-stone-800">Carregando sua jornada...</p>
          <p className="mt-1 text-sm font-medium text-stone-500">Buscando sessão e progresso.</p>
        </div>

        <div className="loading-trivia" aria-live="polite">
          <Sparkles size={13} className="loading-trivia__icon" aria-hidden />
          <AnimatePresence mode="wait">
            <motion.p
              key={trivia}
              className="loading-trivia__text"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              {trivia}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
