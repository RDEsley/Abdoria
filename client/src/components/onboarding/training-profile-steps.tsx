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
  return (
    <>
      <h2 className="text-2xl font-extrabold">Qual é a sua missão?</h2>
      <p className="mt-1 text-sm text-stone-500">Dá pra mudar depois, nas configurações.</p>
      <div className="mt-4 flex flex-col gap-2">
        {(['abdomen', 'corpo_todo'] as EscopoTreino[]).map((escopo) => (
          <button
            key={escopo}
            type="button"
            onClick={() => onChange({ escopo })}
            className={cardClass(draft.escopo === escopo)}
          >
            <span className="font-bold">{ESCOPO_LABELS[escopo]}</span>
            <span className="mt-0.5 block text-xs font-medium text-stone-500">
              {ESCOPO_HINTS[escopo]}
            </span>
          </button>
        ))}
      </div>
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

export function FrequenciaStep({ draft, onChange }: StepProps) {
  return (
    <>
      <h2 className="text-2xl font-extrabold">Sua rotina</h2>
      <p className="mt-1 text-sm text-stone-500">
        Quantas missões por semana cabem na sua vida real?
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {[2, 3, 4, 5, 6, 7].map((freq) => (
          <button
            key={freq}
            type="button"
            onClick={() => onChange({ frequencia: freq })}
            className={`h-12 w-12 rounded-xl border-2 font-bold ${
              draft.frequencia === freq
                ? 'cursor-pointer border-emerald-500 bg-emerald-50'
                : 'cursor-pointer border-stone-200'
            }`}
          >
            {freq}
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
        <div className="flex flex-wrap gap-2">
          {(Object.keys(RESTRICAO_LABELS) as RestricaoFisica[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => toggle(r)}
              className={`rounded-xl border-2 px-4 py-2 font-bold ${
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
