import type { EquipmentId } from '@shared/equipment';
import type { EscopoTreino, Foco, ParteCorpo, PerfilTreino, RestricaoFisica } from '@/types';

/** Rascunho das respostas do questionário de treino (onboarding e re-onboarding). */
export interface TrainingProfileDraft {
  escopo: EscopoTreino | null;
  /** true = card "Recomendado" da missão selecionado (equivale a abdômen + partes automáticas). */
  missaoRecomendada: boolean;
  foco: Foco | null;
  /** null = card "Recomendado" selecionado. */
  partes: ParteCorpo[] | null;
  frequencia: number;
  /** Dias fixos de treino (0=Dom..6=Sáb); [] = ainda não escolhido. */
  diasSemana: number[];
  tempoSessao: PerfilTreino['tempo_por_sessao_min'];
  equipamentos: Partial<Record<EquipmentId, boolean>>;
  restricoes: RestricaoFisica[];
}

export const DEFAULT_TRAINING_DRAFT: TrainingProfileDraft = {
  escopo: null,
  missaoRecomendada: false,
  foco: null,
  partes: null,
  frequencia: 3,
  diasSemana: [],
  tempoSessao: 20,
  equipamentos: {},
  restricoes: [],
};

/** Fecha o rascunho com defaults (fluxo "Pular" reproduz o app de hoje). */
export function draftToPerfilTreino(
  draft: TrainingProfileDraft,
  origem: PerfilTreino['origem'],
): Omit<PerfilTreino, 'atualizado_em'> {
  return {
    escopo: draft.escopo ?? 'abdomen',
    foco: draft.foco ?? 'definicao',
    partes: draft.partes,
    frequencia_semanal: draft.diasSemana.length >= 2 ? draft.diasSemana.length : draft.frequencia,
    dias_semana: draft.diasSemana.length > 0 ? [...draft.diasSemana].sort((a, b) => a - b) : null,
    tempo_por_sessao_min: draft.tempoSessao,
    restricoes: draft.restricoes,
    origem,
  };
}

/** Pré-carrega o rascunho a partir de um perfil salvo (re-onboarding/Configurações). */
export function perfilToDraft(
  perfil: PerfilTreino,
  equipamentos: Partial<Record<EquipmentId, boolean>>,
): TrainingProfileDraft {
  return {
    escopo: perfil.escopo,
    missaoRecomendada: false,
    foco: perfil.foco,
    partes: perfil.partes,
    frequencia: perfil.frequencia_semanal,
    diasSemana: perfil.dias_semana ?? [],
    tempoSessao: perfil.tempo_por_sessao_min,
    equipamentos,
    restricoes: perfil.restricoes,
  };
}
