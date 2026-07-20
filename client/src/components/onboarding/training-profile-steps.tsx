import type { ReactNode } from 'react';
import {
  CalendarDays,
  Dumbbell,
  Flame,
  Gauge,
  HeartPulse,
  Layers,
  PackageOpen,
  PersonStanding,
  ShieldAlert,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { EQUIPMENT_CATALOG } from '@shared/equipment';
import { buildPlanoTreino } from '@shared/training-plan';
import {
  CICLO_HINTS,
  CICLO_LABELS,
  FOCO_HINTS,
  FOCO_LABELS,
  PARTE_CORPO_LABELS,
  PARTE_CORPO_ORDER,
  RESTRICAO_LABELS,
  type Foco,
  type ParteCorpo,
  type PerfilTreino,
  type RestricaoFisica,
  type TreinoBase,
} from '@/types';
import { Chip, OptionCard, StepHeader } from './OnboardingUI';
import { draftToPerfilTreino, type TrainingProfileDraft } from './training-profile-draft';

interface StepProps {
  draft: TrainingProfileDraft;
  onChange: (patch: Partial<TrainingProfileDraft>) => void;
}

export function ScopeStep({ draft, onChange }: StepProps) {
  return (
    <>
      <StepHeader
        icon={<Layers size={22} />}
        title="Qual é a sua missão?"
        subtitle="As missões usam só exercícios possíveis com o equipamento que você marcou. Dá pra mudar depois, nas configurações."
      />
      <div className="mt-4 flex flex-col gap-2">
        <OptionCard
          selected={draft.escopo === 'abdomen'}
          onClick={() => onChange({ escopo: 'abdomen', partes: null, missaoRecomendada: true })}
          icon={<Flame size={18} />}
          title="Só abdômen"
          subtitle="Core em primeiro lugar — o caminho clássico do Abdoria."
          recommended
        />
        <OptionCard
          selected={draft.escopo === 'corpo_todo'}
          onClick={() => onChange({ escopo: 'corpo_todo', partes: null, missaoRecomendada: false })}
          icon={<Layers size={18} />}
          title="Corpo todo"
          subtitle="Um plano completo de casa: pernas, peito, costas e mais — sem largar o abdômen."
        />
      </div>
    </>
  );
}

const FOCO_ICONS: Record<Foco, ReactNode> = {
  definicao: <Zap size={18} />,
  forca: <Dumbbell size={18} />,
  resistencia: <Timer size={18} />,
  hipertrofia: <TrendingUp size={18} />,
  saude: <HeartPulse size={18} />,
};

export function FocoStep({ draft, onChange }: StepProps) {
  return (
    <>
      <StepHeader
        icon={<Gauge size={22} />}
        title="Qual é o seu foco?"
        subtitle="Isso define séries, repetições e descanso das suas missões."
      />
      <div className="mt-4 flex flex-col gap-2">
        {(Object.keys(FOCO_LABELS) as Foco[]).map((foco) => (
          <OptionCard
            key={foco}
            selected={draft.foco === foco}
            onClick={() => onChange({ foco })}
            icon={FOCO_ICONS[foco]}
            title={FOCO_LABELS[foco]}
            subtitle={FOCO_HINTS[foco]}
          />
        ))}
      </div>
    </>
  );
}

export function PartesStep({ draft, onChange }: StepProps) {
  const partes = draft.partes;
  const togglePart = (parte: ParteCorpo) => {
    const current = partes ?? [];
    const next = current.includes(parte) ? current.filter((p) => p !== parte) : [...current, parte];
    onChange({ partes: next, partesTocado: true });
  };

  return (
    <>
      <StepHeader
        icon={<Layers size={22} />}
        title="Quais áreas, além do abdômen?"
        subtitle="O abdômen entra em toda missão — é o coração do Abdoria."
      />
      <OptionCard
        className="mt-4"
        selected={partes === null && draft.partesTocado}
        onClick={() => onChange({ partes: null, partesTocado: true })}
        title="Distribuição automática"
        subtitle="A gente monta a distribuição ideal a partir do seu foco."
        recommended
      />
      <div className="onb-grid-2 mt-3">
        {PARTE_CORPO_ORDER.filter((p) => p !== 'abdomen').map((parte) => (
          <Chip
            key={parte}
            selected={draft.partesTocado && (partes?.includes(parte) ?? false)}
            onClick={() => togglePart(parte)}
            label={PARTE_CORPO_LABELS[parte]}
          />
        ))}
      </div>
    </>
  );
}

const TEMPOS: PerfilTreino['tempo_por_sessao_min'][] = [10, 20, 30, 45];

const DIA_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
/** Seg, Qua, Sex e Sáb — 4 treinos com descanso entre eles. */
const DIAS_RECOMENDADOS = [1, 3, 5, 6];

const sameDays = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().every((d, i) => d === [...b].sort()[i]);

export function FrequenciaStep({ draft, onChange }: StepProps) {
  const toggleDia = (dia: number) => {
    const next = draft.diasSemana.includes(dia)
      ? draft.diasSemana.filter((d) => d !== dia)
      : [...draft.diasSemana, dia];
    onChange({ diasSemana: next, frequencia: Math.max(2, next.length) });
  };

  return (
    <>
      <StepHeader
        icon={<CalendarDays size={22} />}
        title="Sua rotina semanal"
        subtitle="Em quais dias você vai treinar? Nos outros, sugerimos um aquecimento leve ou uma Atividade (leitura, corrida, meditação...) pra manter a sequência sem atrapalhar o descanso."
      />
      <OptionCard
        className="mt-4"
        selected={sameDays(draft.diasSemana, DIAS_RECOMENDADOS)}
        onClick={() =>
          onChange({ diasSemana: [...DIAS_RECOMENDADOS], frequencia: DIAS_RECOMENDADOS.length })
        }
        icon={<Flame size={18} />}
        title="4 dias — Seg · Qua · Sex · Sáb"
        subtitle="Treino e descanso bem distribuídos na semana."
        recommended
      />
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {DIA_LABELS.map((label, dia) => (
          <button
            key={label}
            type="button"
            aria-pressed={draft.diasSemana.includes(dia)}
            onClick={() => toggleDia(dia)}
            className={`h-12 rounded-xl border-2 text-xs font-bold ${
              draft.diasSemana.includes(dia)
                ? 'cursor-pointer border-emerald-500 bg-emerald-50 text-emerald-800'
                : 'cursor-pointer border-stone-200 text-stone-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {draft.diasSemana.length > 4 && (
        <div
          className="mt-3 flex items-start gap-2.5 rounded-xl border-2 border-sky-200 bg-sky-50 p-3"
          role="note"
        >
          <span
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600"
            aria-hidden
          >
            💤
          </span>
          <p className="text-xs font-semibold leading-relaxed text-sky-900">
            <strong>{draft.diasSemana.length} dias é bastante!</strong> O descanso faz parte do
            resultado — é nele que o músculo se reconstrói. Se preferir, treine menos dias e
            preencha os outros com <strong>Atividades</strong> (leitura, corrida, meditação...)
            que mantêm sua sequência sem comprometer a recuperação.
          </p>
        </div>
      )}
      <p className="mt-5 mb-2 text-sm font-bold text-stone-700">Tempo por treino</p>
      <div className="grid grid-cols-4 gap-2">
        {TEMPOS.map((tempo) => (
          <button
            key={tempo}
            type="button"
            onClick={() => onChange({ tempoSessao: tempo })}
            className={`rounded-xl border-2 px-2 py-3 text-sm font-bold ${
              draft.tempoSessao === tempo
                ? 'cursor-pointer border-emerald-500 bg-emerald-50'
                : 'cursor-pointer border-stone-200'
            }`}
          >
            {tempo} min
          </button>
        ))}
      </div>
    </>
  );
}

export function EquipamentoStep({ draft, onChange }: StepProps) {
  return (
    <>
      <StepHeader
        icon={<PackageOpen size={22} />}
        title="Equipamento em casa"
        subtitle="Marca o que você tem — cada item desbloqueia exercícios novos no catálogo."
      />
      <div className="mt-4 flex flex-col gap-2">
        <OptionCard
          selected={draft.equipamentoNenhum}
          onClick={() => onChange({ equipamentos: {}, equipamentoNenhum: true })}
          icon={<PersonStanding size={18} />}
          title="Nenhum, só o peso do corpo"
        />
        {EQUIPMENT_CATALOG.map((item) => {
          const owned = Boolean(draft.equipamentos[item.id]);
          return (
            <OptionCard
              key={item.id}
              selected={owned}
              onClick={() =>
                onChange({
                  equipamentos: { ...draft.equipamentos, [item.id]: !owned },
                  equipamentoNenhum: false,
                })
              }
              icon={<Dumbbell size={18} />}
              title={item.nome}
              subtitle={item.descricao}
            />
          );
        })}
      </div>
    </>
  );
}

export function RestricoesStep({ draft, onChange }: StepProps) {
  const toggle = (r: RestricaoFisica) => {
    onChange({
      restricoes: draft.restricoes.includes(r)
        ? draft.restricoes.filter((x) => x !== r)
        : [...draft.restricoes, r],
    });
  };
  return (
    <>
      <StepHeader
        icon={<ShieldAlert size={22} />}
        title="Alguma região sensível?"
        subtitle="Exercícios que forçam essas regiões saem das suas recomendações."
      />
      <div className="onb-grid-2 mt-4">
        <Chip
          selected={draft.restricoes.length === 0}
          onClick={() => onChange({ restricoes: [] })}
          label="Nenhuma"
        />
        {(Object.keys(RESTRICAO_LABELS) as RestricaoFisica[]).map((r) => (
          <Chip
            key={r}
            selected={draft.restricoes.includes(r)}
            onClick={() => toggle(r)}
            label={RESTRICAO_LABELS[r]}
          />
        ))}
      </div>
      <p className="mt-4 text-xs text-stone-400">
        Isso não substitui orientação médica — se sente dor, procure um profissional de saúde.
      </p>
    </>
  );
}

/** Preview do plano gerado (modo corpo todo) — mesma lógica do server. */
export function PlanoPreview({ draft }: { draft: TrainingProfileDraft }) {
  const perfil = {
    ...draftToPerfilTreino(draft, 'onboarding'),
    atualizado_em: new Date().toISOString(),
  };
  const plano = buildPlanoTreino(perfil, perfil.atualizado_em);
  if (!plano) return null;

  return (
    <div className="mt-4 flex flex-col gap-2">
      {plano.dias.map((dia) => (
        <div key={dia.indice} className="rounded-xl border-2 border-stone-200 px-4 py-3">
          <p className="font-bold text-stone-900">{dia.titulo}</p>
          <p className="mt-0.5 text-xs font-medium text-stone-500">
            {dia.grupos.map((g) => PARTE_CORPO_LABELS[g]).join(' · ')}
          </p>
        </div>
      ))}
      <p className="mt-1 text-xs text-stone-400">
        Os exercícios de cada missão variam conforme seu equipamento e histórico.
      </p>
    </div>
  );
}

/** Card de ciclo de treino (A–G) — usado no passo "Seu ciclo de treinos" do onboarding. */
export function CicloOptionCard({
  ciclo,
  active,
  onClick,
}: {
  ciclo: TreinoBase;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <OptionCard
      selected={active}
      onClick={onClick}
      title={`${ciclo} — ${CICLO_LABELS[ciclo]}`}
      subtitle={CICLO_HINTS[ciclo]}
    />
  );
}
