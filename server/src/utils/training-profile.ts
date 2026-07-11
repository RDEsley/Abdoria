import type {
  EscopoTreino,
  Foco,
  Objetivo,
  ParteCorpo,
  PerfilTreino,
  RestricaoFisica,
} from '../types/index.js';
import { clampFrequencia } from '../../../shared/training-plan.js';

const ESCOPOS: EscopoTreino[] = ['abdomen', 'corpo_todo'];
const FOCOS: Foco[] = ['definicao', 'forca', 'resistencia', 'hipertrofia', 'saude'];
const PARTES: ParteCorpo[] = [
  'abdomen',
  'peito',
  'costas',
  'bracos',
  'ombros',
  'pernas',
  'gluteos',
];
const RESTRICOES: RestricaoFisica[] = ['lombar', 'joelhos', 'punhos', 'ombros', 'pescoco'];
const TEMPOS: PerfilTreino['tempo_por_sessao_min'][] = [10, 20, 30, 45];
const ORIGENS: PerfilTreino['origem'][] = ['onboarding', 'reonboarding', 'skip', 'settings'];

/**
 * Valida/normaliza o perfil de treino vindo do client. Retorna null se o
 * payload não tiver o mínimo (escopo + foco válidos) — nunca grava lixo
 * na coluna JSONB.
 */
export function sanitizePerfilTreino(raw: unknown): PerfilTreino | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;

  const escopo = ESCOPOS.find((e) => e === p.escopo);
  const foco = FOCOS.find((f) => f === p.foco);
  if (!escopo || !foco) return null;

  const partes = Array.isArray(p.partes)
    ? PARTES.filter((parte) => (p.partes as unknown[]).includes(parte))
    : null;

  const restricoes = Array.isArray(p.restricoes)
    ? RESTRICOES.filter((r) => (p.restricoes as unknown[]).includes(r))
    : [];

  const tempo = TEMPOS.find((t) => t === Number(p.tempo_por_sessao_min)) ?? 20;
  const origem = ORIGENS.find((o) => o === p.origem) ?? 'onboarding';

  return {
    escopo,
    foco,
    partes: partes && partes.length > 0 ? partes : null,
    frequencia_semanal: clampFrequencia(Number(p.frequencia_semanal)),
    tempo_por_sessao_min: tempo,
    restricoes,
    origem,
    atualizado_em: new Date().toISOString(),
  };
}

/** Foco novo → coluna objetivo legada (tiered-match de presets continua coerente). */
export function focoToObjetivo(foco: Foco): Objetivo {
  switch (foco) {
    case 'definicao':
      return 'definicao';
    case 'forca':
    case 'hipertrofia':
      return 'forca';
    case 'resistencia':
      return 'resistencia';
    case 'saude':
      return 'manutencao';
  }
}
