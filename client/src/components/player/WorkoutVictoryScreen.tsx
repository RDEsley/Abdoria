import { motion } from 'framer-motion';
import { Coins, Zap } from 'lucide-react';
import { CompletionCelebration } from '@/components/effects/CompletionCelebration';
import { LevelUpCelebration } from '@/components/effects/LevelUpCelebration';
import { StreakFireCelebration } from '@/components/effects/StreakFireCelebration';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';
import { CURRENCY_NAME, type LevelUpCelebration as LevelUpData } from '@/types';
import type { XpBreakdown } from '@/types';

interface Props {
  workoutName: string;
  xpGained: number;
  abdoriaGained: number;
  xpBreakdown: XpBreakdown | null;
  streakCelebration: number | null;
  levelUpCelebration: LevelUpData | null;
  equippedEffectId: string;
  saving: boolean;
  onFinish: () => void;
  showRodadaModal: boolean;
  rodadaBusy: boolean;
  onRodadaKeep: () => void;
  onRodadaSwap: () => void;
}

/** Tela de missão completa: celebrações, recompensas e o gate de rodada completa. */
export function WorkoutVictoryScreen({
  workoutName,
  xpGained,
  abdoriaGained,
  xpBreakdown,
  streakCelebration,
  levelUpCelebration,
  equippedEffectId,
  saving,
  onFinish,
  showRodadaModal,
  rodadaBusy,
  onRodadaKeep,
  onRodadaSwap,
}: Props) {
  return (
    <div className="game-app fixed inset-0 z-50 flex flex-col items-center justify-center p-6">
      <AnimatedBackground variant="player" />
      <CompletionCelebration effectId={equippedEffectId} />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="game-victory relative z-10"
      >
        {streakCelebration !== null ? (
          <StreakFireCelebration streak={streakCelebration} />
        ) : levelUpCelebration ? (
          <LevelUpCelebration
            level={levelUpCelebration.level_novo}
            previousLevel={levelUpCelebration.level_anterior}
          />
        ) : (
          <div className="game-level-badge mx-auto mb-4">✓</div>
        )}
        <h2 className="game-victory__title">MISSÃO COMPLETA!</h2>
        {levelUpCelebration && streakCelebration !== null && (
          <LevelUpCelebration
            compact
            level={levelUpCelebration.level_novo}
            previousLevel={levelUpCelebration.level_anterior}
          />
        )}
        <p className="mt-2 text-sm font-bold text-stone-600">{workoutName}</p>
        {xpGained > 0 && (
          <div className="game-victory__rewards">
            <p className="game-victory__xp">
              <Zap size={14} aria-hidden /> +{xpGained} XP
            </p>
            {abdoriaGained > 0 && (
              <p className="game-victory__abdoria">
                <Coins size={14} aria-hidden /> +{abdoriaGained} {CURRENCY_NAME}
              </p>
            )}
            {xpBreakdown && (
              <ul className="game-victory__breakdown">
                {xpBreakdown.exercicios > 0 && <li>Exercícios +{xpBreakdown.exercicios}</li>}
                {xpBreakdown.exercicios === 0 && xpBreakdown.total_diario === 0 && (
                  <li className="game-victory__breakdown-cap">Mín. 3 exercícios para XP diário</li>
                )}
                {xpBreakdown.streak > 0 && <li>Streak +{xpBreakdown.streak}</li>}
                {xpBreakdown.conquistas > 0 && <li>Conquistas +{xpBreakdown.conquistas}</li>}
                {xpBreakdown.total_bruto > xpBreakdown.aplicado && (
                  <li className="game-victory__breakdown-cap">
                    Máx. diário · +{xpBreakdown.aplicado}/{xpBreakdown.total_bruto} XP
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
        <GameButton onClick={onFinish} size="lg" className="mt-6 w-full" disabled={saving}>
          {saving ? 'Salvando...' : xpGained > 0 ? 'Voltar ao início' : 'Salvar e voltar'}
        </GameButton>
      </motion.div>

      <Modal
        open={showRodadaModal}
        onClose={onRodadaKeep}
        variant="bare"
        panelClassName="w-full max-w-sm"
        labelledBy="rodada-completa-title"
        disableDismiss
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="game-victory !p-6"
        >
          <h3 id="rodada-completa-title" className="game-victory__title !text-base">
            Rodada completa!
          </h3>
          <p className="mt-2 text-sm font-bold text-stone-600">
            Você completou todos os ciclos ativos. Quer um novo set de treinos?
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <GameButton variant="secondary" size="lg" className="w-full" onClick={onRodadaKeep}>
              Manter sugestão atual
            </GameButton>
            <GameButton size="lg" className="w-full" disabled={rodadaBusy} onClick={onRodadaSwap}>
              {rodadaBusy ? 'Sorteando...' : 'Trocar por novo set'}
            </GameButton>
          </div>
        </motion.div>
      </Modal>
    </div>
  );
}
