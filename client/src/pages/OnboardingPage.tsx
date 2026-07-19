import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import Lottie from 'lottie-react';
import { ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { AuthLogo } from '@/components/auth/AuthLogo';
import { useLottieAsset } from '@/hooks/useLottieAsset';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';
import { TermsModal } from '@/components/legal/TermsModal';
import {
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
import { digitsOnly, validateBodyMetrics } from '@/lib/utils';
import {
  calcImc,
  CICLO_LABELS,
  CURRENCY_NAME,
  NIVEL_LABELS,
  normalizeCicloTreinos,
  suggestNivel,
  type ArmaPreferida,
  type NivelUsuario,
  type TreinoBase,
} from '@/types';

type StepId =
  | 'terms'
  | 'body'
  | 'level'
  | 'weapon'
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

/** Formato intuitivo: segundos abaixo de 1min, min+seg a partir daí (ex.: "1min 30s", "5min"). */
function formatHoldDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? `${minutes}min` : `${minutes}min ${seconds}s`;
}

/** Confete de conclusão — Lottie, roda uma vez ao montar o passo final. */
function OnboardingConfetti() {
  const data = useLottieAsset(CONFETTI_LOTTIE_URL);
  if (!data) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <Lottie animationData={data} loop={false} className="mx-auto h-full max-w-md" />
    </div>
  );
}

/** Personagem animado de boas-vindas no passo final (Lottie) — cai pra um
    selo estático se o arquivo ainda não carregou. */
function OnboardingWelcomeCharacter() {
  const data = useLottieAsset(CHARACTER_LOTTIE_URL);
  return (
    <motion.div
      className="relative z-10 mx-auto h-32 w-32"
      initial={{ scale: 0, rotate: -12 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', bounce: 0.55, duration: 0.8 }}
    >
      {data ? (
        <Lottie animationData={data} loop className="h-full w-full drop-shadow-lg" />
      ) : (
        <span className="game-level-badge flex h-full w-full items-center justify-center text-3xl">
          🎉
        </span>
      )}
    </motion.div>
  );
}

const inputClass =
  'rounded-xl border border-stone-300 bg-white px-4 py-3 font-medium text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20';

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
  const [armaPreferida, setArmaPreferida] = useState<ArmaPreferida>('arco');
  const [draft, setDraft] = useState<TrainingProfileDraft>(DEFAULT_TRAINING_DRAFT);
  const [ciclo, setCiclo] = useState<TreinoBase[]>([]);
  const [cicloRecomendado, setCicloRecomendado] = useState(false);
  const [descanso, setDescanso] = useState(30);
  const [modo, setModo] = useState<'tempo' | 'reps'>('tempo');
  const [repSchemeId, setRepSchemeId] = useState<string>('12x3');
  const [esquemaRecomendado, setEsquemaRecomendado] = useState(true);
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

  useEffect(() => {
    if (shakeNonce === lastShakeNonceRef.current) return;
    lastShakeNonceRef.current = shakeNonce;
    void shakeControls.start({ x: [0, -8, 8, -6, 6, -3, 3, 0], transition: { duration: 0.4 } });
  }, [shakeNonce, shakeControls]);

  const corpoTodo = draft.escopo === 'corpo_todo';

  const steps = useMemo<StepId[]>(
    () => [
      'terms',
      'body',
      'level',
      'weapon',
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
          arma_preferida: armaPreferida,
          equipamentos: draft.equipamentos,
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
      return 'Escolha pelo menos uma parte do corpo, ou use o Recomendado.';
    }
    if (stepId === 'frequencia' && draft.diasSemana.length < 2) {
      return 'Escolha pelo menos 2 dias de treino.';
    }
    if (stepId === 'plano' && !corpoTodo && ciclo.length < 2) {
      return 'Escolha pelo menos 2 ciclos de treino, ou use o Recomendado.';
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
    if (step < steps.length - 1) setStep((s) => s + 1);
    else void saveAndFinish(false);
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
        <AuthLogo size="sm" className="mb-6" />

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

        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-stone-200">
          <motion.div
            className="h-full bg-teal-600"
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={stepId}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className={`relative rounded-2xl border border-stone-200 bg-white p-6 shadow-md${invalid ? ' onb-invalid' : ''}`}
          >
            {stepId === 'terms' && (
              <>
                <h2 className="text-2xl font-extrabold text-stone-900">Olá, {firstName}!</h2>
                <p className="mt-2 text-stone-600">
                  Vamos montar seu plano de treino como um personal faria. Aceite os termos para
                  continuar.
                </p>
                {!termsAccepted && (
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    className="mt-4 cursor-pointer text-sm font-bold text-emerald-600 underline"
                  >
                    Ler termos
                  </button>
                )}
              </>
            )}

            {stepId === 'body' && (
              <>
                <h2 className="text-2xl font-extrabold">Seus dados</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Opcional — ajuda a calcular IMC e sugerir treinos.
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={idade}
                    onChange={(e) => setIdade(digitsOnly(e.target.value))}
                    placeholder="Idade (anos)"
                    className={inputClass}
                    maxLength={3}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={peso}
                      onChange={(e) => setPeso(digitsOnly(e.target.value))}
                      placeholder="Peso (kg)"
                      className={inputClass}
                      maxLength={3}
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={altura}
                      onChange={(e) => setAltura(digitsOnly(e.target.value))}
                      placeholder="Altura (cm)"
                      className={inputClass}
                      maxLength={3}
                    />
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
                <h2 className="text-2xl font-extrabold">Classe do herói</h2>
                {nivelSugerido && (
                  <p className="mt-1 text-sm text-stone-500">
                    Sugestão com base nos seus dados: {NIVEL_LABELS[nivelSugerido]}
                  </p>
                )}
                <div className="mt-4 flex flex-col gap-2">
                  {(['iniciante', 'intermediario', 'avancado'] as NivelUsuario[]).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNivel(n)}
                      className={`cursor-pointer rounded-xl border-2 px-4 py-3 text-left font-bold ${
                        nivel === n
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : 'border-stone-200'
                      }`}
                    >
                      {NIVEL_LABELS[n]}
                    </button>
                  ))}
                </div>
              </>
            )}

            {stepId === 'weapon' && (
              <>
                <h2 className="text-2xl font-extrabold">Sua arma</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Escolha o estilo de combate na Exploração AFK.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { id: 'arco' as const, label: 'Arco', hint: 'Ataque à distância' },
                    { id: 'espada' as const, label: 'Espada', hint: 'Combate corpo a corpo' },
                  ].map((weapon) => (
                    <button
                      key={weapon.id}
                      type="button"
                      onClick={() => setArmaPreferida(weapon.id)}
                      className={`cursor-pointer rounded-xl border-2 px-4 py-4 text-left font-bold ${
                        armaPreferida === weapon.id
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : 'border-stone-200'
                      }`}
                    >
                      {weapon.label}
                      <span className="mt-1 block text-xs font-medium text-stone-500">
                        {weapon.hint}
                      </span>
                    </button>
                  ))}
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
                <h2 className="text-2xl font-extrabold">Sua Campanha</h2>
                <p className="mt-1 text-sm text-stone-500">
                  {draft.frequencia} missões por semana, montadas pro seu foco. Dá pra ajustar
                  depois nas configurações.
                </p>
                <PlanoPreview draft={draft} />
              </>
            )}

            {stepId === 'plano' && !corpoTodo && (
              <>
                <h2 className="text-2xl font-extrabold">Seu ciclo de treinos</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Escolha pelo menos 2 ciclos ativos (A–G). Os treinos sugeridos alternam entre
                  eles.
                </p>
                <button
                  type="button"
                  onClick={usarCicloRecomendado}
                  className={`mt-4 w-full cursor-pointer rounded-xl border-2 px-4 py-3 text-left ${
                    cicloRecomendado ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200'
                  }`}
                >
                  <span className="font-bold">⭐ Recomendado</span>
                  <span className="mt-0.5 block text-xs font-medium text-stone-500">
                    A gente monta a rotação ideal pro seu foco — treinos genéricos que evoluem com
                    você.
                  </span>
                </button>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CICLOS.map((c) => {
                    const active = ciclo.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCiclo(c)}
                        className={`cursor-pointer rounded-xl border-2 px-4 py-3 font-bold ${
                          active ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200'
                        }`}
                      >
                        {c} — {CICLO_LABELS[c]}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {stepId === 'prefs' && (
              <>
                <h2 className="text-2xl font-extrabold">Ajustes finos</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Exercícios de segurar (prancha, barra fixa) usam segundos; os demais usam
                  repetições. Deixe no Recomendado que a gente ajusta pelo seu nível.
                </p>
                <button
                  type="button"
                  onClick={() => setEsquemaRecomendado(true)}
                  className={`mt-4 w-full cursor-pointer rounded-xl border-2 px-4 py-3 text-left ${
                    esquemaRecomendado ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200'
                  }`}
                >
                  <span className="font-bold">⭐ Recomendado</span>
                  <span className="mt-0.5 block text-xs font-medium text-stone-500">
                    Repetições e tempos na medida do nível{' '}
                    {nivel ? NIVEL_LABELS[nivel].toLowerCase() : 'iniciante'}. Dá pra mudar depois.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setEsquemaRecomendado(false)}
                  className={`mt-2 w-full cursor-pointer rounded-xl border-2 px-4 py-3 text-left ${
                    !esquemaRecomendado ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200'
                  }`}
                >
                  <span className="font-bold">Personalizar</span>
                  <span className="mt-0.5 block text-xs font-medium text-stone-500">
                    Escolha você mesmo os tempos e repetições.
                  </span>
                </button>
                {!esquemaRecomendado && (
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
                    <div className="grid grid-cols-2 gap-2">
                      {REP_SCHEMES.map((scheme) => (
                        <button
                          key={scheme.id}
                          type="button"
                          onClick={() => setRepSchemeId(scheme.id)}
                          className={`cursor-pointer rounded-xl border-2 px-3 py-2 text-sm font-bold ${
                            repSchemeId === scheme.id
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-stone-200'
                          }`}
                        >
                          {scheme.label}
                        </button>
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
                    <div className="mt-4 flex gap-2">
                      {(['tempo', 'reps'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setModo(m)}
                          className={`flex-1 cursor-pointer rounded-xl border-2 py-3 font-bold ${
                            modo === m ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200'
                          }`}
                        >
                          {m === 'tempo' ? 'Prefiro tempo' : 'Prefiro repetições'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {stepId === 'tutorial' && (
              <div className="relative text-center">
                <OnboardingConfetti />
                <OnboardingWelcomeCharacter />
                <motion.h2
                  className="mt-3 text-2xl font-extrabold"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  Boas-vindas, {firstName}!
                </motion.h2>
                <motion.p
                  className="mt-2 truncate text-sm font-semibold text-emerald-700"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                >
                  Sua jornada começa agora!
                </motion.p>
                <motion.ul
                  className="mx-auto mt-4 max-w-xs space-y-2 text-left text-sm text-stone-700"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <li>💪 Treine e ganhe XP todo dia.</li>
                  <li>🪙 Ganhe {CURRENCY_NAME} treinando e suba no ranking semanal.</li>
                  <li>🔥 Mantenha a sequência — nos dias de descanso, um aquecimento leve conta.</li>
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
