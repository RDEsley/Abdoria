import type { EquipmentId } from '@shared/equipment';
import type { EscopoTreino, Foco, ParteCorpo, PerfilTreino, RestricaoFisica } from '@/types';

/** Rascunho das respostas do questionário de treino (onboarding e re-onboarding). */
export interface TrainingProfileDraft {
  escopo: EscopoTreino | null;
  foco: Foco | null;
  /** null = card "Recomendado" selecionado. */
  partes: ParteCorpo[] | null;
  frequencia: number;
  tempoSessao: PerfilTreino['tempo_por_sessao_min'];
  equipamentos: Partial<Record<EquipmentId, boolean>>;
  restricoes: RestricaoFisica[];
}

export const DEFAULT_TRAINING_DRAFT: TrainingProfileDraft = {
  escopo: null,
  foco: null,
  partes: null,
  frequencia: 3,
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
    frequencia_semanal: draft.frequencia,
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
    foco: perfil.foco,
    partes: perfil.partes,
    frequencia: perfil.frequencia_semanal,
    tempoSessao: perfil.tempo_por_sessao_min,
    equipamentos,
    restricoes: perfil.restricoes,
  };
}
