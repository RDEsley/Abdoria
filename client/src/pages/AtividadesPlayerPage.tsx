import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { AtividadeCompleteModal } from '@/components/dashboard/AtividadeCompleteModal';
import { WorkoutVictoryScreen } from '@/components/player/WorkoutVictoryScreen';
import { useAtividadesFlow, type AtividadesFluxoResumo } from '@/hooks/useAtividadesFlow';
import { useAuth } from '@/context/AuthContext';
import { resolveCosmeticos } from '@/types';

/**
 * Tela cheia (mesma linguagem visual do Player) só pras Atividades do dia,
 * usada quando o "Iniciar" da Home abre em dia de descanso com fila —
 * sem treino nenhum envolvido. Ao concluir, cai na mesma Missão Completa.
 */
export function AtividadesPlayerPage() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const flow = useAtividadesFlow();
  const [iniciado, setIniciado] = useState(false);
  const [resumoFinal, setResumoFinal] = useState<AtividadesFluxoResumo | null>(null);
  const equippedEffectId = resolveCosmeticos(authUser?.cosmeticos).efeito_equipado;

  useEffect(() => {
    if (iniciado) return;
    if (flow.filaPendente.length === 0) {
      navigate('/', { replace: true });
      return;
    }
    flow.iniciarFluxo();
    setIniciado(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dispara uma vez, assim que a fila do dia estiver disponível
  }, [flow.filaPendente.length]);

  if (!iniciado) return null;

  if (resumoFinal) {
    return (
      <WorkoutVictoryScreen
        workoutName="Atividades do dia"
        xpGained={resumoFinal.xp}
        abdoriaGained={resumoFinal.moedas}
        atividadesConcluidas={resumoFinal.total}
        xpBreakdown={null}
        streakCelebration={resumoFinal.streakCelebration}
        levelUpCelebration={resumoFinal.levelUp}
        equippedEffectId={equippedEffectId}
        saving={false}
        saved
        onFinish={() => {}}
        onContinue={() => navigate('/')}
        showRodadaModal={false}
        rodadaBusy={false}
        onRodadaKeep={() => {}}
        onRodadaSwap={() => {}}
      />
    );
  }

  const atividadeAtual = flow.atividadeDoPasso;
  const passoAtual = (flow.passoFila ?? 0) + 1;

  return (
    <div className="game-player game-app fixed inset-0 z-50 flex flex-col overflow-hidden">
      <AnimatedBackground variant="player" />
      <header className="game-player-hud relative z-10 shrink-0 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setResumoFinal(flow.fecharFluxo())}
          className="cursor-pointer font-bold text-stone-600"
          aria-label="Sair das atividades"
        >
          <X size={24} />
        </button>
        <div className="text-center">
          <p className="game-page-header__eyebrow !mb-0">Dia de descanso</p>
          <p className="text-xs font-extrabold text-stone-800">
            Atividade {passoAtual}/{flow.totalFluxo}
          </p>
        </div>
        <span className="w-6" aria-hidden />
      </header>

      <div className="relative z-10 flex shrink-0 gap-1 px-4 pb-1 sm:px-6">
        {Array.from({ length: flow.totalFluxo }).map((_, i) => (
          <span
            key={i}
            className={`game-progress-dot h-1.5 flex-1 rounded-full border border-stone-900/25 ${
              i < passoAtual - 1
                ? 'bg-emerald-500'
                : i === passoAtual - 1
                  ? 'bg-amber-400 game-progress-dot--active'
                  : 'bg-stone-200/80'
            }`}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
        <p className="text-sm font-bold text-stone-600">
          Hoje é dia de descanso — bora cuidar de você.
        </p>
      </div>

      {atividadeAtual && (
        <AtividadeCompleteModal
          atividade={atividadeAtual}
          busy={flow.busy}
          passo={passoAtual}
          totalPassos={flow.totalFluxo}
          daXp={!flow.diaDeTreino}
          onCancel={() => setResumoFinal(flow.fecharFluxo())}
          onConfirm={(dados) => void flow.concluirPassoFila(dados, setResumoFinal)}
        />
      )}
    </div>
  );
}
