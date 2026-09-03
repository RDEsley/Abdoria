import type { AtividadeExtra, AtividadeTipo, AtividadesAgenda } from '../atividades.js';
import type { ActivityCategory, ActivityMetricKind, ActivitySchedule } from './types.js';

const TIPO_CATEGORY: Record<AtividadeTipo, ActivityCategory> = {
  leitura: 'mente',
  estudo: 'mente',
  escrita: 'mente',
  meditacao: 'mente',
  corrida: 'corpo',
  pedalada: 'corpo',
  caminhada: 'corpo',
  natacao: 'corpo',
  alongamento: 'corpo',
  yoga: 'corpo',
  esporte: 'corpo',
  organizacao: 'vida',
  generico: 'outro',
};

const TIPO_TEMPLATE: Partial<Record<AtividadeTipo, string>> = {
  leitura: 'tpl_leitura',
  estudo: 'tpl_estudo',
  escrita: 'tpl_escrita',
  meditacao: 'tpl_meditacao',
  corrida: 'tpl_corrida',
  caminhada: 'tpl_caminhada',
  alongamento: 'tpl_alongamento',
  yoga: 'tpl_yoga',
  organizacao: 'tpl_organizar',
};

export function categoryFromLegacyTipo(tipo: AtividadeTipo): ActivityCategory {
  return TIPO_CATEGORY[tipo] ?? 'outro';
}

export function templateFromLegacyTipo(tipo: AtividadeTipo): string | null {
  return TIPO_TEMPLATE[tipo] ?? null;
}

export function metricFromLegacy(atividade: AtividadeExtra): {
  metric_kind: ActivityMetricKind;
  metric_unit: string | null;
  goal_value: number | null;
} {
  if (atividade.meta_tipo === 'tempo') {
    return { metric_kind: 'duration', metric_unit: 'min', goal_value: atividade.meta_valor };
  }
  return {
    metric_kind: 'count',
    metric_unit: atividade.meta_unidade ?? 'unidades',
    goal_value: atividade.meta_valor,
  };
}

export function scheduleFromLegacyAgenda(agenda?: AtividadesAgenda | null): ActivitySchedule {
  if (!agenda || agenda.modo === 'todos_dias') {
    return { kind: 'daily', weekdays: [], times: [], period: null, once_at: null };
  }
  return {
    kind: 'weekdays',
    weekdays: agenda.dias ?? [],
    times: [],
    period: null,
    once_at: null,
  };
}
