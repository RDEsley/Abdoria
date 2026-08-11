import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, ChevronRight, X } from 'lucide-react';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import {
  AtividadeCompleteModal,
  type AtividadeConclusao,
} from '@/components/dashboard/AtividadeCompleteModal';
import { WorkoutVictoryScreen } from '@/components/player/WorkoutVictoryScreen';
import { CampaignStoryScreen } from '@/components/player/CampaignStoryScreen';
import { ACHIEVEMENT_ICON_COMPONENTS } from '@/components/gamification/achievement-icons';
import { showGameToast } from '@/components/ui/GameToast';
import { useAtividadesFlow, type AtividadesFluxoResumo } from '@/hooks/useAtividadesFlow';
import { useAuth } from '@/context/AuthContext';
import { ATIVIDADES_MIN_DESCANSO, type AtividadeExtra } from '@shared/atividades';
import {
  buildCampaignPosts,
  CAMPAIGN_STREAK_MILESTONES,
  CAMPAIGN_STREAK_NARRATIVE_MIN,
  type CampaignCatalogInfo,
  type CampaignPost,
  type CapituloOverride,
} from '@shared/campaign';
import { getTodaySaoPaulo } from '@shared/utils/timezone';
import { CURRENCY_NAME, resolveCosmeticos, xpLevelFromTotal, type AfkEnemyId } from '@/types';

/** Capítulo de campanha da leva de atividades recém-concluída (mesma lógica do feed).
    `isFirstEver`/sessão chaveada por dia: mesmas garantias do fluxo de treino
    (ver PlayerPage.buildStoryPost) — só vira "capítulo" com um marco real
    confirmado pelo servidor, e repetir a tela no mesmo dia mostra o mesmo
    capítulo em vez de sortear outro. */
function buildAtividadesStoryPost(
  resumo: AtividadesFluxoResumo,
  heroi: string,
  level: number,
  bestiarioDesbloqueados: AfkEnemyId[],
  isFirstEver: boolean,
): CampaignPost | null {
  if (resumo.feitas.length === 0) return null;
  const sessionId = `atividades-${getTodaySaoPaulo()}`;
  const capituloOverride: CapituloOverride | null = isFirstEver
    ? { sessionId, marco: { tipo: 'primeiro' } }
    : resumo.streakCelebration != null &&
        resumo.streakCelebration >= CAMPAIGN_STREAK_NARRATIVE_MIN &&
        CAMPAIGN_STREAK_MILESTONES.includes(resumo.streakCelebration)
      ? { sessionId, marco: { tipo: 'streak', dias: resumo.streakCelebration } }
      : null;
  const posts = buildCampaignPosts(
    [
      {
        id: sessionId,
        treino_nome: 'Atividades',
        exercicios: [],
        duracao_total_segundos: 0,
        xp_ganho: resumo.xp,
        concluido_em: new Date().toISOString(),
        isAtividade: true,
        atividadesFeitas: resumo.feitas,
      },
    ],
    new Map<string, CampaignCatalogInfo>(),
    { heroi, level, bestiarioDesbloqueados },
    capituloOverride,
  );
  return posts[0] ?? null;
}

/**
 * Tela cheia (mesma linguagem visual do Player) só pras Atividades do dia —
 * usada pelo "Iniciar" do card de Atividades, pelo "Iniciar" da Home em dia
 * de descanso, e pelo "Sim, fazer agora" do prompt pós-treino. Em vez de um
 * form solto aparecendo por cima da página, o usuário escolhe da lista qual
 * atividade quer fazer agora (não é uma ordem estrita) e pode sair a
 * qualquer momento com "Fazer mais tarde".
 */
export function AtividadesPlayerPage() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const flow = useAtividadesFlow();
  const [entradaValidada, setEntradaValidada] = useState(false);
  const [selecionada, setSelecionada] = useState<AtividadeExtra | null>(null);
  const [concluidasNestaSessao, setConcluidasNestaSessao] = useState(0);
  const [resumoFinal, setResumoFinal] = useState<AtividadesFluxoResumo | null>(null);
  const [showStory, setShowStory] = useState(false);
  const equippedEffectId = resolveCosmeticos(authUser?.cosmeticos).efeito_equipado;
  // Snapshot pré-fluxo (só roda no mount, via inicializador de useState): mesma
  // lógica do PlayerPage — `applyUser` roda a cada atividade concluída, então
  // captura uma vez só, antes da primeira conclusão.
  const [isFirstEver] = useState(() => (authUser?.gamificacao?.streak_maior ?? 0) === 0);

  // Guarda de entrada: sem fila pendente, não tem o que fazer aqui.
  useEffect(() => {
    if (entradaValidada) return;
    if (flow.filaPendente.length === 0) {
      navigate('/', { replace: true });
      return;
    }
    setEntradaValidada(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na entrada, assim que a fila do dia estiver disponível
  }, [flow.filaPendente.length]);

  // A fila só encolhe depois do refresh que segue cada conclusão — quando
  // zera (e já concluiu algo nesta sessão), fecha o fluxo e comemora.
  useEffect(() => {
    if (concluidasNestaSessao === 0 || resumoFinal) return;
    if (flow.filaPendente.length === 0) {
      setResumoFinal(flow.fecharFluxo());
    }
  }, [flow, concluidasNestaSessao, resumoFinal]);

  if (!entradaValidada) return null;

  if (resumoFinal) {
    const storyPost = authUser
      ? buildAtividadesStoryPost(
          resumoFinal,
          authUser.nome?.split(' ')[0] ?? 'O herói',
          xpLevelFromTotal(authUser.gamificacao?.nivel_xp ?? 0),
          (authUser.gamificacao?.bestiario_desbloqueados ?? []) as AfkEnemyId[],
          isFirstEver,
        )
      : null;

    if (showStory && storyPost) {
      return <CampaignStoryScreen post={storyPost} onContinue={() => navigate('/')} />;
    }

    return (
      <WorkoutVictoryScreen
        workoutName="Atividades concluídas"
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
        onContinue={() => {
          if (storyPost) setShowStory(true);
          else navigate('/');
        }}
        showRodadaModal={false}
        rodadaBusy={false}
        onRodadaKeep={() => {}}
        onRodadaSwap={() => {}}
        footnote={
          <>
            <CalendarCheck size={13} aria-hidden /> Tudo já registrado no seu calendário de hoje.
          </>
        }
      />
    );
  }

  const fazerMaisTarde = () => {
    const resumo = flow.fecharFluxo();
    if (resumo.total > 0) {
      showGameToast(
        `${resumo.total} atividade(s) concluída(s). Pode terminar o resto mais tarde.`,
        { variant: 'success' },
      );
    }
    navigate('/');
  };

  const confirmarEscolhida = async (dados: AtividadeConclusao) => {
    if (!selecionada) return;
    const nome = selecionada.nome;
    const resultado = await flow.concluirEscolhida(selecionada, dados);
    if (!resultado) return;
    setSelecionada(null);
    setConcluidasNestaSessao((n) => n + 1);
    const ganho =
      resultado.xp > 0
        ? `+${resultado.xp} XP`
        : resultado.moedas > 0
          ? `+${resultado.moedas} ${CURRENCY_NAME}`
          : null;
    showGameToast(`"${nome}" concluída!${ganho ? ` ${ganho}` : ''}`, { variant: 'success' });
  };

  const progressoHoje = flow.concluidasHoje.size;

  return (
    <div className="game-player game-app fixed inset-0 z-50 flex flex-col overflow-hidden">
      <AnimatedBackground variant="player" />
      <header className="game-player-hud relative z-10 shrink-0 flex items-center justify-between">
        <button
          type="button"
          onClick={fazerMaisTarde}
          className="cursor-pointer font-bold text-stone-600"
          aria-label="Fazer mais tarde"
          title="Fazer mais tarde"
        >
          <X size={24} />
        </button>
        <div className="text-center">
          <p className="game-page-header__eyebrow !mb-0">Atividades</p>
          <p className="text-xs font-extrabold text-stone-800">
            {flow.filaPendente.length} atividade{flow.filaPendente.length === 1 ? '' : 's'} pendente
            {flow.filaPendente.length === 1 ? '' : 's'}
          </p>
        </div>
        <span className="w-6" aria-hidden />
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 sm:px-6">
        <p className="text-center text-sm font-bold text-stone-600">
          Escolha qual você quer fazer agora:
        </p>

        <ul className="atividades-player-lista">
          {flow.filaPendente.map((atividade) => {
            const Icon = ACHIEVEMENT_ICON_COMPONENTS[atividade.icon];
            const meta =
              atividade.meta_tipo === 'tempo'
                ? `${atividade.meta_valor} min`
                : `${atividade.meta_valor} ${atividade.meta_unidade ?? ''}`.trim();
            return (
              <li key={atividade.id}>
                <button
                  type="button"
                  className="atividades-player-item"
                  onClick={() => setSelecionada(atividade)}
                >
                  <span className="atividades-player-item__icon" aria-hidden>
                    <Icon size={18} />
                  </span>
                  <span className="atividades-player-item__text">
                    <strong>{atividade.nome}</strong>
                    <small>{meta}</small>
                  </span>
                  <ChevronRight size={16} className="atividades-player-item__chevron" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="game-player-actions relative z-10 shrink-0 px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:px-6">
        <button type="button" onClick={fazerMaisTarde} className="game-auth-guest-link">
          Fazer mais tarde
        </button>
      </div>

      {selecionada && (
        <AtividadeCompleteModal
          atividade={selecionada}
          busy={flow.busy}
          progressoHoje={progressoHoje}
          metaHoje={ATIVIDADES_MIN_DESCANSO}
          onCancel={() => setSelecionada(null)}
          onConfirm={(dados) => void confirmarEscolhida(dados)}
        />
      )}
    </div>
  );
}
