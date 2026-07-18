import { EQUIPMENT_CATALOG } from '@shared/equipment';
import { buildPlanoTreino } from '@shared/training-plan';
import {
  ESCOPO_LABELS,
  FOCO_HINTS,
  FOCO_LABELS,
  PARTE_CORPO_LABELS,
  PARTE_CORPO_ORDER,
  RESTRICAO_LABELS,
  type EscopoTreino,
  type Foco,
  type ParteCorpo,
  type PerfilTreino,
  type RestricaoFisica,
} from '@/types';
import { draftToPerfilTreino, type TrainingProfileDraft } from './training-profile-draft';

interface StepProps {
  draft: TrainingProfileDraft;
  onChange: (patch: Partial<TrainingProfileDraft>) => void;
}

const cardClass = (active: boolean) =>
  `cursor-pointer rounded-xl border-2 px-4 py-3 text-left ${
    active ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200'
  }`;

const ESCOPO_HINTS: Record<EscopoTreino, string> = {
  abdomen: 'Missões focadas no core — o clássico Abdoria.',
  corpo_todo: 'Um plano completo de casa: pernas, peito, costas e mais.',
};

export function ScopeStep({ draft, onChange }: StepProps) {
  const areasSelecionadas = draft.escopo === 'corpo_todo' && draft.partes !== null;
  const toggleArea = (parte: ParteCorpo) => {
    const current = areasSelecionadas ? (draft.partes ?? []) : [];
    const next = current.includes(parte) ? current.filter((p) => p !== parte) : [...current, parte];
    onChange({
      escopo: next.length > 0 ? 'corpo_todo' : null,
      partes: next.length > 0 ? next : null,
      missaoRecomendada: false,
    });
  };

  return (
    <>
      <h2 className="text-2xl font-extrabold">Qual é a sua missão?</h2>
      <p className="mt-1 text-sm text-stone-500">
        As missões usam só exercícios possíveis com o equipamento que você marcou.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onChange({ escopo: 'abdomen', partes: null, missaoRecomendada: true })}
          className={cardClass(draft.missaoRecomendada)}
        >
          <span className="font-bold">⭐ Recomendado</span>
          <span className="mt-0.5 block text-xs font-medium text-stone-500">
            Core em primeiro lugar — o caminho clássico do Abdoria.
          </span>
        </button>
        {(['abdomen', 'corpo_todo'] as EscopoTreino[]).map((escopo) => (
          <button
            key={escopo}
            type="button"
            onClick={() => onChange({ escopo, partes: null, missaoRecomendada: false })}
            className={cardClass(
              !draft.missaoRecomendada && draft.escopo === escopo && !areasSelecionadas,
            )}
          >
            <span className="font-bold">{ESCOPO_LABELS[escopo]}</span>
            <span className="mt-0.5 block text-xs font-medium text-stone-500">
              {ESCOPO_HINTS[escopo]}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-4 mb-2 text-sm font-bold text-stone-700">Ou escolha as áreas que quer treinar</p>
      <div className="flex flex-wrap gap-2">
        {PARTE_CORPO_ORDER.filter((p) => p !== 'abdomen').map((parte) => (
          <button
            key={parte}
            type="button"
            onClick={() => toggleArea(parte)}
            className={`cursor-pointer rounded-xl border-2 px-4 py-2 font-bold ${
              areasSelecionadas && draft.partes?.includes(parte)
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-stone-200'
            }`}
          >
            {PARTE_CORPO_LABELS[parte]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-stone-400">
        O abdômen entra em toda missão. Dá pra mudar depois, nas configurações.
      </p>
    </>
  );
}

export function FocoStep({ draft, onChange }: StepProps) {
  return (
    <>
      <h2 className="text-2xl font-extrabold">Seu foco</h2>
      <p className="mt-1 text-sm text-stone-500">
        Define séries, repetições e descanso das missões.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {(Object.keys(FOCO_LABELS) as Foco[]).map((foco) => (
          <button
            key={foco}
            type="button"
            onClick={() => onChange({ foco })}
            className={cardClass(draft.foco === foco)}
          >
            <span className="font-bold">{FOCO_LABELS[foco]}</span>
            <span className="mt-0.5 block text-xs font-medium text-stone-500">
              {FOCO_HINTS[foco]}
            </span>
          </button>
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
    onChange({ partes: next });
  };

  return (
    <>
      <h2 className="text-2xl font-extrabold">Partes do corpo</h2>
      <p className="mt-1 text-sm text-stone-500">
        O abdômen entra em toda missão — é o coração do Abdoria.
      </p>
      <button
        type="button"
        onClick={() => onChange({ partes: null })}
        className={`mt-4 w-full ${cardClass(partes === null)}`}
      >
        <span className="font-bold">⭐ Recomendado</span>
        <span className="mt-0.5 block text-xs font-medium text-stone-500">
          A gente monta a distribuição ideal a partir do seu foco.
        </span>
      </button>
      <div className="mt-3 flex flex-wrap gap-2">
        {PARTE_CORPO_ORDER.filter((p) => p !== 'abdomen').map((parte) => (
          <button
            key={parte}
            type="button"
            onClick={() => togglePart(parte)}
            className={`rounded-xl border-2 px-4 py-2 font-bold ${
              partes?.includes(parte)
                ? 'cursor-pointer border-emerald-500 bg-emerald-50'
                : 'cursor-pointer border-stone-200'
            }`}
          >
            {PARTE_CORPO_LABELS[parte]}
          </button>
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
      <h2 className="text-2xl font-extrabold">Sua rotina</h2>
      <p className="mt-1 text-sm text-stone-500">
        Em quais dias da semana você vai treinar? Nos outros, a gente sugere um aquecimento leve
        pra manter a sequência sem atrapalhar o descanso.
      </p>
      <button
        type="button"
        onClick={() =>
          onChange({ diasSemana: [...DIAS_RECOMENDADOS], frequencia: DIAS_RECOMENDADOS.length })
        }
        className={`mt-4 w-full ${cardClass(sameDays(draft.diasSemana, DIAS_RECOMENDADOS))}`}
      >
        <span className="font-bold">⭐ Recomendado — 4 dias</span>
        <span className="mt-0.5 block text-xs font-medium text-stone-500">
          Seg · Qua · Sex · Sáb — treino e descanso bem distribuídos.
        </span>
      </button>
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
  const nenhum = Object.values(draft.equipamentos).every((v) => !v);
  return (
    <>
      <h2 className="text-2xl font-extrabold">Equipamento em casa</h2>
      <p className="mt-1 text-sm text-stone-500">
        Marca o que você tem — cada item desbloqueia exercícios no catálogo.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onChange({ equipamentos: {} })}
          className={cardClass(nenhum)}
        >
          <span className="font-bold">Nenhum, só o peso do corpo</span>
        </button>
        {EQUIPMENT_CATALOG.map((item) => {
          const owned = Boolean(draft.equipamentos[item.id]);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                onChange({ equipamentos: { ...draft.equipamentos, [item.id]: !owned } })
              }
              className={cardClass(owned)}
            >
              <span className="font-bold">{item.nome}</span>
              <span className="mt-0.5 block text-xs font-medium text-stone-500">
                {item.descricao}
              </span>
            </button>
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
      <h2 className="text-2xl font-extrabold">Alguma região sensível?</h2>
      <p className="mt-1 text-sm text-stone-500">
        Exercícios que forçam essas regiões saem das recomendações.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onChange({ restricoes: [] })}
          className={cardClass(draft.restricoes.length === 0)}
        >
          <span className="font-bold">Nenhuma</span>
        </button>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(RESTRICAO_LABELS) as RestricaoFisica[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => toggle(r)}
              className={`rounded-xl border-2 px-3 py-3 text-center font-bold ${
                draft.restricoes.includes(r)
                  ? 'cursor-pointer border-emerald-500 bg-emerald-50'
                  : 'cursor-pointer border-stone-200'
              }`}
            >
              {RESTRICAO_LABELS[r]}
            </button>
          ))}
        </div>
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
