import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { useLottie } from 'lottie-react';
import {
  BicepsFlexed,
  Cake,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Compass,
  Flame,
  Gamepad2,
  Gauge,
  ListChecks,
  MessageSquareText,
  PartyPopper,
  Rocket,
  Ruler,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SkipForward,
  SlidersHorizontal,
  Swords,
  UserCog,
  Weight,
} from 'lucide-react';
import { AuthLogo } from '@/components/auth/AuthLogo';
import { useLottieAsset } from '@/hooks/useLottieAsset';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';
import { MiniErrorBoundary } from '@/components/ui/MiniErrorBoundary';
import { TermsModal } from '@/components/legal/TermsModal';
import { Chip, OptionCard, StepHeader } from '@/components/onboarding/OnboardingUI';
import {
  CicloOptionCard,
  EquipamentoStep,
  FocoStep,
  FrequenciaStep,
  PartesStep,
  PlanoPreview,
  RestricoesStep,
  ScopeStep,
} from '@/components/onboarding/training-profile-steps';
import {
  DEFAULT_TRAINING_DRAFT,
  draftToPerfilTreino,
  type TrainingProfileDraft,
} from '@/components/onboarding/training-profile-draft';
import { useAuth } from '@/context/AuthContext';
import { completeOnboarding } from '@/lib/api';
import { playCompleteSet, playSuccess } from '@/lib/sounds';
import {
  digitsOnly,
  formatAlturaMask,
  sanitizeDecimalInput,
  validateBodyMetrics,
} from '@/lib/utils';
import {
  calcImc,
  NIVEL_LABELS,
  normalizeCicloTreinos,
  suggestNivel,
  type NivelUsuario,
  type TomTexto,
  type TreinoBase,
} from '@/types';

type StepId =
  | 'terms'
  | 'linguagem'
  | 'body'
  | 'level'
  | 'scope'
  | 'foco'
  | 'partes'
  | 'frequencia'
  | 'equipamento'
  | 'restricoes'
  | 'plano'
  | 'prefs'
  | 'tutorial';

const CICLOS: TreinoBase[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

const REP_SCHEMES = [
  { id: '12x3', series: 3, repeticoes: 12, label: '12 × 3' },
  { id: '14x3', series: 3, repeticoes: 14, label: '14 × 3' },
  { id: '15x3', series: 3, repeticoes: 15, label: '15 × 3' },
  { id: '15x5', series: 5, repeticoes: 15, label: '15 × 5' },
] as const;

/** Esquema derivado do nível — mesmo critério das recomendações da Missão. */
const SCHEME_BY_NIVEL: Record<NivelUsuario, (typeof REP_SCHEMES)[number]['id']> = {
  iniciante: '12x3',
  intermediario: '14x3',
  avancado: '15x3',
};

/** Ciclos sugeridos por foco — a rotação genérica que o sistema monta sozinho. */
const CICLOS_POR_FOCO: Record<string, TreinoBase[]> = {
  definicao: ['A', 'B', 'C'],
  forca: ['A', 'C', 'D'],
  resistencia: ['B', 'D', 'E'],
  hipertrofia: ['A', 'B', 'C'],
  saude: ['D', 'E'],
};

const CONFETTI_LOTTIE_URL = '/assets/Confetti.json';
const CHARACTER_LOTTIE_URL = '/assets/character-welcome.json';

function LottieView({ data, loop }: { data: unknown | null; loop: boolean }) {
  const { View } = useLottie(
    { animationData: data ?? undefined, loop },
    { width: '100%', height: '100%' },
  );
  return View;
}

/** Formato intuitivo: segundos abaixo de 1min, min+seg a partir daí (ex.: "1min 30s", "5min"). */
function formatHoldDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? `${minutes}min` : `${minutes}min ${seconds}s`;
}

/**
 * Confete de conclusão — Lottie, roda uma vez ao montar o passo final.
 * Renderizado via portal em `document.body`: o passo fica dentro de vários
 * `motion.div` animados (a troca de step usa `x`/`opacity`), e qualquer
 * ancestral com `transform` ativo vira containing block pra `position:fixed`
 * — sem o portal, o confete ficava preso ao card do passo em vez de cobrir
 * a tela toda.
 */
function OnboardingConfetti() {
  const { user } = useAuth();
  const data = useLottieAsset(CONFETTI_LOTTIE_URL);
  if (!data || typeof document === 'undefined') return null;
  if (!(user?.preferencias?.confetti_animacoes_habilitadas ?? true)) return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden>
      <LottieView data={data} loop={false} />
    </div>,
    document.body,
  );
}

/** Personagem animado de boas-vindas no passo final (Lottie) — cai pra um
    medalhão ilustrado (não um emoji cru) se o arquivo ainda não carregou. */
function OnboardingWelcomeCharacter() {
  const data = useLottieAsset(CHARACTER_LOTTIE_URL);
  return (
    <motion.div
      className="onb-welcome-medal relative z-10 mx-auto"
      initial={{ scale: 0, rotate: -12 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', bounce: 0.55, duration: 0.8 }}
    >
      <span className="onb-welcome-medal__ring" aria-hidden />
      {data ? (
        <LottieView data={data} loop />
      ) : (
        <PartyPopper size={40} className="onb-welcome-medal__icon" aria-hidden />
      )}
    </motion.div>
  );
}

const WELCOME_FALLBACK = (
  <span className="onb-welcome-medal onb-welcome-medal--static relative z-10 mx-auto">
    <span className="onb-welcome-medal__ring" aria-hidden />
    <PartyPopper size={40} className="onb-welcome-medal__icon" aria-hidden />
  </span>
);

export function OnboardingPage() {
  const { user, refreshUser, applyUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [showTerms, setShowTerms] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [idade, setIdade] = useState('');
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [nivel, setNivel] = useState<NivelUsuario | null>(null);
  const [tomTexto, setTomTexto] = useState<TomTexto>('jogo');
  const [draft, setDraft] = useState<TrainingProfileDraft>(DEFAULT_TRAINING_DRAFT);
  const [ciclo, setCiclo] = useState<TreinoBase[]>([]);
  const [cicloRecomendado, setCicloRecomendado] = useState(false);
  const [descanso, setDescanso] = useState(30);
  const [modo, setModo] = useState<'tempo' | 'reps'>('tempo');
  const [repSchemeId, setRepSchemeId] = useState<string>('12x3');
  const [esquemaEscolha, setEsquemaEscolha] = useState<'recomendado' | 'personalizar' | null>(null);
  const [tempoHold, setTempoHold] = useState(30);
  const [invalid, setInvalid] = useState(false);
  const [shakeNonce, setShakeNonce] = useState(0);
  const [saving, setSaving] = useState(false);
  const [skipped, setSkipped] = useState(false);
  // Controles imperativos (não a prop `animate` declarativa): o botão Continuar
  // é remontado a cada troca de etapa (fica dentro do motion.div key={stepId}),
  // e um `animate` declarativo replaya o shake nesse remount mesmo sem nova
  // falha de validação. Com controles + useEffect guardado por ref, o shake
  // só dispara quando shakeNonce realmente muda — nunca por causa do remount.
  const shakeControls = useAnimationControls();
  const lastShakeNonceRef = useRef(shakeNonce);
  const progressPulseControls = useAnimationControls();

  useEffect(() => {
    if (shakeNonce === lastShakeNonceRef.current) return;
    lastShakeNonceRef.current = shakeNonce;
    void shakeControls.start({ x: [0, -8, 8, -6, 6, -3, 3, 0], transition: { duration: 0.4 } });
  }, [shakeNonce, shakeControls]);

  // Pequeno pulso de reforço na barra de progresso a cada troca de passo —
  // feedback visual leve (sem som) toda vez que o usuário avança ou volta.
  useEffect(() => {
    void progressPulseControls.start({
      boxShadow: ['0 0 0 0 rgba(13, 148, 136, 0.55)', '0 0 0 6px rgba(13, 148, 136, 0)'],
      transition: { duration: 0.5 },
    });
  }, [step, progressPulseControls]);

  const corpoTodo = draft.escopo === 'corpo_todo';

  const steps = useMemo<StepId[]>(
    () => [
      'terms',
      'linguagem',
      'body',
      'level',
      'equipamento',
      'scope',
      'foco',
      ...(corpoTodo ? (['partes'] as StepId[]) : []),
      'frequencia',
      'restricoes',
      'plano',
      'prefs',
      'tutorial',
    ],
    [corpoTodo],
  );
  const stepId = steps[Math.min(step, steps.length - 1)];

  const patchDraft = (patch: Partial<TrainingProfileDraft>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  const bodyMetrics = useMemo(
    () => validateBodyMetrics(idade, peso, altura),
    [idade, peso, altura],
  );
  const imc =
    bodyMetrics.peso_kg && bodyMetrics.altura_cm
      ? calcImc(bodyMetrics.peso_kg, bodyMetrics.altura_cm)
      : null;
  const imcLabel =
    imc === null
      ? null
      : imc < 18.5
        ? 'Abaixo do peso'
        : imc < 25
          ? 'Normal'
          : imc < 30
            ? 'Sobrepeso'
            : 'Obesidade';

  const nivelSugerido = bodyMetrics.idade && imc ? suggestNivel(bodyMetrics.idade, imc) : null;
  // Só "personalizar" explícito muda o comportamento; "Pular" sem escolher
  // (esquemaEscolha null) cai no automático, igual ao restante do fluxo skip.
  const esquemaRecomendado = esquemaEscolha !== 'personalizar';

  const saveAndFinish = async (skip = false) => {
    setSaving(true);
    try {
      const schemeId = esquemaRecomendado ? SCHEME_BY_NIVEL[nivel ?? 'iniciante'] : repSchemeId;
      const scheme = REP_SCHEMES.find((s) => s.id === schemeId) ?? REP_SCHEMES[0];
      const payload: Parameters<typeof completeOnboarding>[0] = {
        terms_accepted: termsAccepted,
        onboarding_completed: true,
        skip,
        perfil_treino: draftToPerfilTreino(draft, skip || skipped ? 'skip' : 'onboarding'),
        preferencias: {
          descanso_padrao_seg: descanso,
          modo_padrao: modo,
          reps_series_padrao: scheme.series,
          reps_repeticoes_padrao: scheme.repeticoes,
          esquema_recomendado: esquemaRecomendado,
          ...(esquemaRecomendado ? {} : { tempo_exercicio_padrao_seg: tempoHold }),
          ciclo_treinos: normalizeCicloTreinos(ciclo),
          som_habilitado: true,
          sfx_volume: 0.7,
          tutorial_visto: false,
          equipamentos: draft.equipamentos,
          tom_texto: tomTexto,
        },
      };

      if (bodyMetrics.idade !== null) payload.idade = bodyMetrics.idade;
      if (bodyMetrics.peso_kg !== null) payload.peso_kg = bodyMetrics.peso_kg;
      if (bodyMetrics.altura_cm !== null) payload.altura_cm = bodyMetrics.altura_cm;
      if (nivel) payload.nivel = nivel;

      const updatedUser = await completeOnboarding(payload);
      applyUser(updatedUser);
      await refreshUser();
      navigate('/', { replace: true, state: { showTutorial: true } });
    } finally {
      setSaving(false);
    }
  };

  const validateCurrentStep = (): string | null => {
    if (stepId === 'terms' && !termsAccepted) return 'Aceite os termos para continuar.';
    if (stepId === 'body') return bodyMetrics.error;
    if (stepId === 'level' && !nivel) return 'Selecione seu nível de treino.';
    if (stepId === 'scope' && !draft.escopo) return 'Escolha a sua missão.';
    if (stepId === 'foco' && !draft.foco) return 'Selecione seu foco.';
    if (stepId === 'partes' && draft.partes !== null && draft.partes.length === 0) {
      return 'Escolha pelo menos uma área, ou use a Distribuição automática.';
    }
    if (stepId === 'frequencia' && draft.diasSemana.length < 2) {
      return 'Escolha pelo menos 2 dias de treino.';
    }
    if (stepId === 'plano' && !corpoTodo && ciclo.length < 2) {
      return 'Escolha pelo menos 2 ciclos de treino, ou use a rotação recomendada.';
    }
    if (stepId === 'prefs' && esquemaEscolha === null) {
      return 'Escolha uma opção pra continuar.';
    }
    return null;
  };

  const next = () => {
    const error = validateCurrentStep();
    if (error) {
      setInvalid(true);
      setShakeNonce((n) => n + 1);
      showGameToast(error, { variant: 'warn' });
      return;
    }
    setInvalid(false);
    if (step < steps.length - 1) {
      playCompleteSet();
      setStep((s) => s + 1);
    } else {
      playSuccess();
      void saveAndFinish(false);
    }
  };

  const skipStep = () => {
    setInvalid(false);
    if (stepId !== 'terms' && stepId !== 'tutorial') setSkipped(true);
    if (step < steps.length - 1) setStep((s) => s + 1);
    else void saveAndFinish(true);
  };

  const prev = () => {
    setInvalid(false);
    if (step > 0) setStep((s) => s - 1);
  };

  const toggleCiclo = (c: TreinoBase) => {
    setCicloRecomendado(false);
    setCiclo((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const usarCicloRecomendado = () => {
    setCicloRecomendado(true);
    setCiclo(CICLOS_POR_FOCO[draft.foco ?? 'definicao'] ?? ['A', 'B', 'C']);
  };

  const firstName = user?.nome?.split(' ')[0] ?? 'Atleta';

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <TermsModal
        open={showTerms}
        requireAccept
        onAccept={() => {
          setTermsAccepted(true);
          setShowTerms(false);
        }}
      />

      <div className="mx-auto max-w-lg">
        <AuthLogo size="xl" showLabel={false} className="mb-6" />

        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-bold text-teal-700">
            Passo {step + 1} / {steps.length}
          </p>
          <button
            type="button"
            onClick={skipStep}
            className="flex cursor-pointer items-center gap-1 text-sm font-semibold text-stone-500 hover:text-stone-700"
          >
            <SkipForward size={16} /> Pular
          </button>
        </div>

        <motion.div
          className="mb-4 h-1.5 overflow-hidden rounded-full bg-stone-200"
          animate={progressPulseControls}
        >
          <motion.div
            className="h-full bg-teal-600"
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={stepId}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className={`onb-step-card relative rounded-2xl border border-stone-200 bg-white p-6 shadow-md${invalid ? ' onb-invalid' : ''}`}
          >
            {stepId === 'terms' && (
              <>
                <StepHeader
                  icon={<Rocket size={22} />}
                  title={`Bem-vindo, ${firstName}!`}
                  subtitle="Vamos montar seu plano de treino em poucos passos — como se um personal trainer tivesse te avaliado. Leva menos de 2 minutos."
                />
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="mt-4 cursor-pointer text-sm font-bold text-emerald-600 underline"
                >
                  Ver termos e condições
                </button>
              </>
            )}

            {stepId === 'linguagem' && (
              <>
                <StepHeader
                  icon={<Gamepad2 size={22} />}
                  title="Como você prefere?"
                  subtitle="Dá pra trocar depois nas Opções"
                />
                <div className="mt-4 flex flex-col gap-2">
                  <OptionCard
                    selected={tomTexto === 'jogo'}
                    onClick={() => setTomTexto('jogo')}
                    icon={<Gamepad2 size={18} />}
                    title="Modo Gamer"
                    subtitle="HP, XP, Heroi e o resto do vocabulário RPG — a experiência completa."
                    recommended
                  />
                  <OptionCard
                    selected={tomTexto === 'normal'}
                    onClick={() => setTomTexto('normal')}
                    icon={<MessageSquareText size={18} />}
                    title="Modo Normal"
                    subtitle="Tudo em português direto, sem termos de jogo — pra quem só quer treinar."
                  />
                </div>
              </>
            )}

            {stepId === 'body' && (
              <>
                <StepHeader
                  icon={<Ruler size={22} />}
                  title="Seus dados"
                  subtitle="Opcional — ajuda a calcular seu IMC e sugerir o nível de treino ideal."
                />
                <div className="mt-4 flex flex-col gap-3">
                  <label className="onb-field">
                    <span className="onb-field__icon" aria-hidden>
                      <Cake size={16} />
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={idade}
                      onChange={(e) => setIdade(digitsOnly(e.target.value))}
                      placeholder="Idade"
                      maxLength={3}
                    />
                    <span className="onb-field__suffix">anos</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="onb-field">
                      <span className="onb-field__icon" aria-hidden>
                        <Weight size={16} />
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={peso}
                        onChange={(e) => setPeso(sanitizeDecimalInput(e.target.value))}
                        placeholder="72.5"
                        maxLength={5}
                      />
                      <span className="onb-field__suffix">kg</span>
                    </label>
                    <label className="onb-field">
                      <span className="onb-field__icon" aria-hidden>
                        <Ruler size={16} />
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatAlturaMask(altura)}
                        onChange={(e) => setAltura(digitsOnly(e.target.value).slice(0, 3))}
                        placeholder="1.75"
                        maxLength={4}
                      />
                      <span className="onb-field__suffix">m</span>
                    </label>
                  </div>
                  {imc !== null && (
                    <div className="rounded-xl bg-emerald-50 p-4">
                      <p className="font-bold text-emerald-800">IMC: {imc}</p>
                      <p className="text-sm text-emerald-700">{imcLabel}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {stepId === 'level' && (
              <>
                <StepHeader
                  icon={<BicepsFlexed size={22} />}
                  title="Seu nível de treino"
                  subtitle={
                    nivelSugerido
                      ? `Sugestão com base nos seus dados: ${NIVEL_LABELS[nivelSugerido]}.`
                      : 'Isso ajusta a intensidade das missões à capacidade do seu corpo hoje.'
                  }
                />
                <div className="mt-4 flex flex-col gap-2">
                  <OptionCard
                    selected={nivel === 'iniciante'}
                    onClick={() => setNivel('iniciante')}
                    icon={<SignalLow size={18} />}
                    title={NIVEL_LABELS.iniciante}
                    subtitle="Pouca experiência ou voltando depois de um tempo parado — começamos leve."
                  />
                  <OptionCard
                    selected={nivel === 'intermediario'}
                    onClick={() => setNivel('intermediario')}
                    icon={<SignalMedium size={18} />}
                    title={NIVEL_LABELS.intermediario}
                    subtitle="Já treina com regularidade e aguenta um ritmo mais puxado."
                  />
                  <OptionCard
                    selected={nivel === 'avancado'}
                    onClick={() => setNivel('avancado')}
                    icon={<SignalHigh size={18} />}
                    title={NIVEL_LABELS.avancado}
                    subtitle="Treino é rotina — pode encarar cargas e intensidade máximas desde já."
                  />
                </div>
              </>
            )}

            {stepId === 'scope' && <ScopeStep draft={draft} onChange={patchDraft} />}
            {stepId === 'foco' && <FocoStep draft={draft} onChange={patchDraft} />}
            {stepId === 'partes' && <PartesStep draft={draft} onChange={patchDraft} />}
            {stepId === 'frequencia' && <FrequenciaStep draft={draft} onChange={patchDraft} />}
            {stepId === 'equipamento' && <EquipamentoStep draft={draft} onChange={patchDraft} />}
            {stepId === 'restricoes' && <RestricoesStep draft={draft} onChange={patchDraft} />}

            {stepId === 'plano' && corpoTodo && (
              <>
                <StepHeader
                  icon={<Compass size={22} />}
                  title="Sua campanha"
                  subtitle={`${draft.frequencia} missões por semana, montadas pro seu foco. Dá pra ajustar depois nas configurações.`}
                />
                <PlanoPreview draft={draft} />
              </>
            )}

            {stepId === 'plano' && !corpoTodo && (
              <>
                <StepHeader
                  icon={<ListChecks size={22} />}
                  title="Seu ciclo de treinos"
                  subtitle="Escolha pelo menos 2 ciclos ativos. Os treinos sugeridos alternam entre eles pra não repetir sempre a mesma missão."
                />
                <OptionCard
                  className="mt-4"
                  selected={cicloRecomendado}
                  onClick={usarCicloRecomendado}
                  title="Rotação ideal pro seu foco"
                  subtitle="Treinos genéricos que evoluem com você — dá pra trocar quando quiser."
                  recommended
                />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {CICLOS.map((c, i) => (
                    <div
                      key={c}
                      className={
                        i === CICLOS.length - 1 && CICLOS.length % 2 !== 0
                          ? 'col-span-2'
                          : undefined
                      }
                    >
                      <CicloOptionCard
                        ciclo={c}
                        active={ciclo.includes(c)}
                        onClick={() => toggleCiclo(c)}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {stepId === 'prefs' && (
              <>
                <StepHeader
                  icon={<SlidersHorizontal size={22} />}
                  title="Como você quer treinar?"
                  subtitle="Define quantas repetições ou segundos cada exercício pede. Exercícios de segurar (prancha, barra fixa) sempre usam tempo; os demais usam repetições."
                />
                <div className="mt-4 flex flex-col gap-2">
                  <OptionCard
                    selected={esquemaEscolha === 'recomendado'}
                    onClick={() => setEsquemaEscolha('recomendado')}
                    icon={<Gauge size={18} />}
                    title="Deixar no automático"
                    subtitle={`Repetições e tempos ajustados pro nível ${nivel ? NIVEL_LABELS[nivel].toLowerCase() : 'iniciante'}. Dá pra mudar quando quiser.`}
                    recommended
                  />
                  <OptionCard
                    selected={esquemaEscolha === 'personalizar'}
                    onClick={() => setEsquemaEscolha('personalizar')}
                    icon={<UserCog size={18} />}
                    title="Personalizar agora"
                    subtitle="Escolha você mesmo o tempo de prancha, as repetições por série e o descanso."
                  />
                </div>
                {esquemaEscolha === 'personalizar' && (
                  <div className="mt-4">
                    <label className="block text-sm font-semibold">
                      Tempo nos exercícios de segurar: {formatHoldDuration(tempoHold)}
                      <input
                        type="range"
                        min={10}
                        max={300}
                        step={5}
                        value={tempoHold}
                        onChange={(e) => setTempoHold(Number(e.target.value))}
                        className="mt-2 w-full cursor-pointer"
                      />
                    </label>
                    <p className="mt-4 mb-2 text-sm font-bold text-stone-700">
                      Repetições por série
                    </p>
                    <div className="onb-grid-2">
                      {REP_SCHEMES.map((scheme) => (
                        <Chip
                          key={scheme.id}
                          selected={repSchemeId === scheme.id}
                          onClick={() => setRepSchemeId(scheme.id)}
                          label={scheme.label}
                        />
                      ))}
                    </div>
                    <label className="mt-4 block text-sm font-semibold">
                      Descanso entre séries: {descanso}s
                      <input
                        type="range"
                        min={10}
                        max={90}
                        value={descanso}
                        onChange={(e) => setDescanso(Number(e.target.value))}
                        className="mt-2 w-full cursor-pointer"
                      />
                    </label>
                    <div className="mt-4 onb-grid-2">
                      {(['tempo', 'reps'] as const).map((m) => (
                        <Chip
                          key={m}
                          selected={modo === m}
                          onClick={() => setModo(m)}
                          label={m === 'tempo' ? 'Prefiro tempo' : 'Prefiro repetições'}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {stepId === 'tutorial' && (
              <div className="relative text-center">
                <MiniErrorBoundary>
                  <OnboardingConfetti />
                </MiniErrorBoundary>

                <motion.span
                  className="onb-welcome-pill relative z-10"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  <CheckCircle2 size={12} aria-hidden /> Perfil pronto
                </motion.span>

                <MiniErrorBoundary fallback={WELCOME_FALLBACK}>
                  <OnboardingWelcomeCharacter />
                </MiniErrorBoundary>

                <motion.h2
                  className="onb-welcome-title relative z-10"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  Boas-vindas, {firstName}!
                </motion.h2>
                <motion.p
                  className="relative z-10 mt-1 text-sm font-semibold text-emerald-700"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Sua jornada começa agora!
                </motion.p>

                <motion.ul
                  className="onb-welcome-list relative z-10"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                >
                  <li>
                    <span className="onb-welcome-list__icon onb-welcome-list__icon--xp" aria-hidden>
                      <Rocket size={15} />
                    </span>
                    Treine e ganhe XP todo dia.
                  </li>
                  <li>
                    <span
                      className="onb-welcome-list__icon onb-welcome-list__icon--coins"
                      aria-hidden
                    >
                      <Coins size={15} />
                    </span>
                    Ganhe Moedas treinando e suba no ranking semanal.
                  </li>
                  <li>
                    <span
                      className="onb-welcome-list__icon onb-welcome-list__icon--streak"
                      aria-hidden
                    >
                      <Flame size={15} />
                    </span>
                    Sem treino hoje? Uma Atividade como alongamento ou leitura já mantém sua
                    sequência.
                  </li>
                  <li>
                    <span
                      className="onb-welcome-list__icon onb-welcome-list__icon--rpg"
                      aria-hidden
                    >
                      <Swords size={15} />
                    </span>
                    Na Home, abra o RPG pelo botão de espadas no canto inferior direito.
                  </li>
                </motion.ul>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              {step > 0 && (
                <GameButton
                  type="button"
                  variant="secondary"
                  onClick={prev}
                  className="flex items-center gap-1"
                  size="lg"
                >
                  <ChevronLeft size={18} /> Voltar
                </GameButton>
              )}
              <motion.div className="flex-1" animate={shakeControls}>
                <GameButton
                  onClick={next}
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2"
                  size="lg"
                >
                  {step === steps.length - 1 ? (saving ? 'Salvando...' : 'Começar!') : 'Continuar'}
                  <ChevronRight size={20} />
                </GameButton>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
