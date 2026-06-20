import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { AuthLogo } from '@/components/auth/AuthLogo';
import { GameButton } from '@/components/ui/GameButton';
import { TermsModal } from '@/components/legal/TermsModal';
import { useAuth } from '@/context/AuthContext';
import { completeOnboarding } from '@/lib/api';
import { digitsOnly, validateBodyMetrics } from '@/lib/utils';
import {
  ABDORIA_XP_STEP,
  calcImc,
  CICLO_LABELS,
  CICLOS_OPCIONAIS,
  NIVEL_LABELS,
  OBJETIVO_HINTS,
  OBJETIVO_LABELS,
  normalizeCicloTreinos,
  suggestNivel,
  type ArmaPreferida,
  type NivelUsuario,
  type Objetivo,
  type TreinoBase,
} from '@/types';

const STEPS = ['terms', 'body', 'level', 'weapon', 'objective', 'cycle', 'prefs', 'tutorial'] as const;
const CICLOS: TreinoBase[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

const REP_SCHEMES = [
  { id: '12x3', series: 3, repeticoes: 12, label: '12 × 3' },
  { id: '14x3', series: 3, repeticoes: 14, label: '14 × 3' },
  { id: '15x3', series: 3, repeticoes: 15, label: '15 × 3' },
  { id: '15x5', series: 5, repeticoes: 15, label: '15 × 5' },
] as const;

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
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [ciclo, setCiclo] = useState<TreinoBase[]>([]);
  const [descanso, setDescanso] = useState(30);
  const [modo, setModo] = useState<'tempo' | 'reps'>('tempo');
  const [repSchemeId, setRepSchemeId] = useState<string>('12x3');
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const bodyMetrics = useMemo(() => validateBodyMetrics(idade, peso, altura), [idade, peso, altura]);
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

  const nivelSugerido =
    bodyMetrics.idade && imc ? suggestNivel(bodyMetrics.idade, imc) : null;

  const saveAndFinish = async (skip = false) => {
    setSaving(true);
    setFieldError(null);
    try {
      const scheme = REP_SCHEMES.find((s) => s.id === repSchemeId) ?? REP_SCHEMES[0];
      const payload: Parameters<typeof completeOnboarding>[0] = {
        terms_accepted: termsAccepted,
        onboarding_completed: true,
        skip,
        preferencias: {
          descanso_padrao_seg: descanso,
          modo_padrao: modo,
          reps_series_padrao: scheme.series,
          reps_repeticoes_padrao: scheme.repeticoes,
          ciclo_treinos: normalizeCicloTreinos(ciclo),
          som_habilitado: true,
          sfx_volume: 0.7,
          tutorial_visto: false,
          arma_preferida: armaPreferida,
        },
      };

      if (bodyMetrics.idade !== null) payload.idade = bodyMetrics.idade;
      if (bodyMetrics.peso_kg !== null) payload.peso_kg = bodyMetrics.peso_kg;
      if (bodyMetrics.altura_cm !== null) payload.altura_cm = bodyMetrics.altura_cm;
      if (nivel) payload.nivel = nivel;
      if (objetivo) payload.objetivo = objetivo;

      const updatedUser = await completeOnboarding(payload);
      applyUser(updatedUser);
      await refreshUser();
      navigate('/', { replace: true, state: { showTutorial: true } });
    } finally {
      setSaving(false);
    }
  };

  const validateCurrentStep = (): string | null => {
    if (step === 0 && !termsAccepted) return 'Aceite os termos para continuar.';
    if (step === 1) return bodyMetrics.error;
    if (step === 2 && !nivel) return 'Selecione seu nível de treino.';
    if (step === 4 && !objetivo) return 'Selecione seu objetivo.';
    if (step === 5 && ciclo.length < 2) return 'Escolha pelo menos 2 ciclos de treino.';
    return null;
  };

  const next = () => {
    const error = validateCurrentStep();
    if (error) {
      setFieldError(error);
      return;
    }
    setFieldError(null);
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else void saveAndFinish(false);
  };

  const skipStep = () => {
    setFieldError(null);
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else void saveAndFinish(true);
  };

  const prev = () => {
    setFieldError(null);
    if (step > 0) setStep((s) => s - 1);
  };

  const toggleCiclo = (c: TreinoBase) => {
    if (CICLOS_OPCIONAIS.includes(c)) return;
    setCiclo((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
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
            Passo {step + 1} / {STEPS.length}
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
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-md"
          >
            {step === 0 && (
              <>
                <h2 className="text-2xl font-extrabold text-stone-900">Olá, {firstName}!</h2>
                <p className="mt-2 text-stone-600">
                  Vamos personalizar seus treinos. Aceite os termos para continuar.
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

            {step === 1 && (
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

            {step === 2 && (
              <>
                <h2 className="text-2xl font-extrabold">Seu nível</h2>
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
                        nivel === n ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-stone-200'
                      }`}
                    >
                      {NIVEL_LABELS[n]}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="text-2xl font-extrabold">Sua arma</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Escolha o estilo de combate na patrulha AFK.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {([
                    { id: 'arco' as const, label: 'Arco', hint: 'Ataque à distância' },
                    { id: 'espada' as const, label: 'Espada', hint: 'Combate corpo a corpo' },
                  ]).map((weapon) => (
                    <button
                      key={weapon.id}
                      type="button"
                      onClick={() => setArmaPreferida(weapon.id)}
                      className={`cursor-pointer rounded-xl border-2 px-4 py-4 text-left font-bold ${
                        armaPreferida === weapon.id ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-stone-200'
                      }`}
                    >
                      {weapon.label}
                      <span className="mt-1 block text-xs font-medium text-stone-500">{weapon.hint}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h2 className="text-2xl font-extrabold">Seu objetivo</h2>
                <p className="mt-1 text-sm text-stone-500">O que você quer alcançar com os treinos?</p>
                <div className="mt-4 flex flex-col gap-2">
                  {(['definicao', 'resistencia', 'forca', 'manutencao'] as Objetivo[]).map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setObjetivo(o)}
                      className={`cursor-pointer rounded-xl border-2 px-4 py-3 text-left ${
                        objetivo === o ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200'
                      }`}
                    >
                      <span className="font-bold">{OBJETIVO_LABELS[o]}</span>
                      <span className="mt-0.5 block text-xs font-medium text-stone-500">
                        {OBJETIVO_HINTS[o]}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <h2 className="text-2xl font-extrabold">Seu ciclo de treinos</h2>
                <p className="mt-1 text-sm text-stone-500">Escolha pelo menos 2 ciclos ativos (A–E). F e G chegam em breve.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {CICLOS.map((c) => {
                    const optional = CICLOS_OPCIONAIS.includes(c);
                    const active = ciclo.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        disabled={optional}
                        onClick={() => toggleCiclo(c)}
                        className={`rounded-xl border-2 px-4 py-3 font-bold ${
                          optional
                            ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
                            : active
                              ? 'cursor-pointer border-emerald-500 bg-emerald-50'
                              : 'cursor-pointer border-stone-200'
                        }`}
                      >
                        {c} — {CICLO_LABELS[c]}
                        {optional && <span className="ml-1 text-[0.65rem] font-semibold">(em breve)</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 6 && (
              <>
                <h2 className="text-2xl font-extrabold">Preferências</h2>
                <label className="mt-4 block text-sm font-semibold">
                  Descanso padrão: {descanso}s
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
                      {m === 'tempo' ? 'Por tempo' : 'Por repetições'}
                    </button>
                  ))}
                </div>
                {modo === 'reps' && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-bold text-stone-700">Esquema de repetições padrão</p>
                    <div className="grid grid-cols-2 gap-2">
                      {REP_SCHEMES.map((scheme) => (
                        <button
                          key={scheme.id}
                          type="button"
                          onClick={() => setRepSchemeId(scheme.id)}
                          className={`cursor-pointer rounded-xl border-2 px-3 py-2 text-sm font-bold ${
                            repSchemeId === scheme.id ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200'
                          }`}
                        >
                          {scheme.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {step === 7 && (
              <>
                <h2 className="text-2xl font-extrabold">Bem-vindo ao Abdoria!</h2>
                <p className="mt-2 text-sm font-semibold text-emerald-700">Sua jornada começa agora — passo 8/8</p>
                <ul className="mt-4 space-y-3 text-sm text-stone-700">
                  <li><strong>XP diário:</strong> {20} XP por exercício (mín. 3 no treino). Teto = 100 + 1 por nível. Reseta à meia-noite (SP).</li>
                  <li><strong>Abdoria coins:</strong> 1 moeda a cada {ABDORIA_XP_STEP} XP ganhos — use na loja de cosméticos.</li>
                  <li><strong>Treinos:</strong> Monte ou escolha sugestões no Construtor. Ciclos A–E alternam foco muscular.</li>
                  <li><strong>Ranking semanal:</strong> Top 25 ganham Abdoria coins todo domingo.</li>
                  <li><strong>Streak & conquistas:</strong> XP extra fora do teto diário.</li>
                </ul>
              </>
            )}

            {fieldError && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{fieldError}</p>
            )}

            <div className="mt-6 flex gap-3">
              {step > 0 && (
                <GameButton type="button" variant="secondary" onClick={prev} className="flex items-center gap-1" size="lg">
                  <ChevronLeft size={18} /> Voltar
                </GameButton>
              )}
              <GameButton
                onClick={next}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2"
                size="lg"
              >
                {step === STEPS.length - 1 ? (saving ? 'Salvando...' : 'Começar!') : 'Continuar'}
                <ChevronRight size={20} />
              </GameButton>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
