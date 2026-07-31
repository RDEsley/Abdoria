import type { AchievementIcon, UserPreferencias } from './types/index.js';

/**
 * Atividades: tarefas de bem-estar que o usuário enfileira na Missão Diária.
 *
 * Regra de negócio (2026-07-31, streak revista):
 * - XP: toda atividade concluída dá `ATIVIDADE_XP_POR_UNIDADE` XP, em
 *   QUALQUER dia (treino ou descanso), até `ATIVIDADES_MIN_DESCANSO` por dia
 *   (`ATIVIDADES_XP_MAX_DIARIO` no total). Atividade extra além desse limite
 *   não dá XP — dá `ATIVIDADE_COINS_EXTRA` Coins.
 * - Streak: uma única atividade concluída já mantém a sequência, em
 *   QUALQUER dia (treino ou descanso) — não tem mais mínimo de 3 nem
 *   distinção por tipo de dia. Treino e Atividades não se substituem: os
 *   dois contam pra streak, mas concluir Atividades nunca marca a Missão
 *   de treino do dia como feita (só um treino de verdade faz isso).
 *
 * A lista é do usuário: começa como cópia do catálogo padrão e vira uma
 * lista própria e ordenável assim que ele cria/edita/exclui/reordena algo.
 */

export type AtividadeTipo =
  | 'leitura'
  | 'corrida'
  | 'pedalada'
  | 'caminhada'
  | 'natacao'
  | 'meditacao'
  | 'alongamento'
  | 'yoga'
  | 'estudo'
  | 'esporte'
  | 'escrita'
  | 'organizacao'
  | 'generico';

/** Como o usuário mede a meta da atividade: duração ou uma contagem livre. */
export type AtividadeMetaTipo = 'tempo' | 'numero';

export interface AtividadeExtra {
  id: string;
  nome: string;
  descricao: string;
  icon: AchievementIcon;
  /** Define o formulário contextual de conclusão. */
  tipo: AtividadeTipo;
  /** 'tempo' = meta em minutos; 'numero' = meta em unidades livres. */
  meta_tipo: AtividadeMetaTipo;
  /** Valor da meta (minutos quando `meta_tipo` = 'tempo'). */
  meta_valor: number;
  /** Rótulo da unidade quando `meta_tipo` = 'numero' (ex.: "páginas"). */
  meta_unidade?: string;
  /** true = veio do catálogo padrão (ainda assim pode ser editada/excluída). */
  builtin?: boolean;
}

export const ATIVIDADE_DURACAO_MIN = 5;
export const ATIVIDADE_DURACAO_MAX = 60;
export const ATIVIDADE_NUMERO_MIN = 1;
export const ATIVIDADE_NUMERO_MAX = 999;
export const ATIVIDADE_NOME_MAX = 40;
export const ATIVIDADE_DESCRICAO_MAX = 100;
export const ATIVIDADE_OBS_MAX = 400;
/** Teto de atividades cadastradas (padrão + criadas pelo usuário). */
export const ATIVIDADES_MAX = 30;
/** Mínimo de atividades concluídas pra manter a streak num dia de descanso;
    também é o teto diário de atividades que pagam XP (ver abaixo). */
export const ATIVIDADES_MIN_DESCANSO = 3;
/** XP fixo por atividade concluída, dentro do teto diário. */
export const ATIVIDADE_XP_POR_UNIDADE = 15;
/** Teto diário de XP vindo de atividades (3 × 15). */
export const ATIVIDADES_XP_MAX_DIARIO = ATIVIDADES_MIN_DESCANSO * ATIVIDADE_XP_POR_UNIDADE;
/** Coins dados por atividade extra do dia, depois de bater o teto de XP. */
export const ATIVIDADE_COINS_EXTRA = 5;

export const ATIVIDADES_LIMITE_MSG =
  'Você atingiu o limite de atividades. Remova uma ou mais para adicionar outra.';

/** 15 ícones disponíveis no criador de atividade. */
export const ATIVIDADE_ICONES: AchievementIcon[] = [
  'star',
  'target',
  'zap',
  'sun',
  'moon',
  'heart',
  'trophy',
  'rocket',
  'droplet',
  'sparkles',
  'calendar',
  'clock',
  'shield',
  'flame',
  'dumbbell',
];

export const ATIVIDADE_TIPO_LABELS: Record<AtividadeTipo, string> = {
  leitura: 'Leitura',
  corrida: 'Corrida',
  pedalada: 'Pedalada',
  caminhada: 'Caminhada',
  natacao: 'Natação',
  meditacao: 'Meditação',
  alongamento: 'Alongamento',
  yoga: 'Yoga',
  estudo: 'Estudo',
  esporte: 'Esporte',
  escrita: 'Escrita',
  organizacao: 'Organização',
  generico: 'Outro',
};

/* ------------------------------------------------------------------ */
/* Formulário contextual de conclusão                                   */
/* ------------------------------------------------------------------ */

export interface AtividadeCampo {
  id: string;
  label: string;
  formato: 'inteiro' | 'decimal' | 'texto';
  unidade?: string;
  placeholder?: string;
}

const CAMPO_TEMPO: AtividadeCampo = {
  id: 'tempo_min',
  label: 'Por quanto tempo?',
  formato: 'inteiro',
  unidade: 'min',
  placeholder: '20',
};

/** Campos por tipo — o que perguntamos ao concluir cada atividade. Todos
    opcionais: servem só pro registro no calendário/campanha, nunca bloqueiam
    a conclusão (XP e streak não dependem de nenhum valor preenchido aqui). */
export const ATIVIDADE_CAMPOS: Record<AtividadeTipo, AtividadeCampo[]> = {
  leitura: [
    {
      id: 'paginas',
      label: 'Quantas páginas você leu?',
      formato: 'inteiro',
      unidade: 'páginas',
      placeholder: '10',
    },
    { id: 'obra', label: 'Qual livro/material?', formato: 'texto', placeholder: 'Ex.: Hábitos Atômicos' },
    CAMPO_TEMPO,
  ],
  corrida: [
    {
      id: 'km',
      label: 'Quantos km você correu?',
      formato: 'decimal',
      unidade: 'km',
      placeholder: '5',
    },
    CAMPO_TEMPO,
  ],
  pedalada: [
    {
      id: 'km',
      label: 'Quantos km você pedalou?',
      formato: 'decimal',
      unidade: 'km',
      placeholder: '12',
    },
    CAMPO_TEMPO,
  ],
  caminhada: [
    {
      id: 'km',
      label: 'Quantos km você caminhou?',
      formato: 'decimal',
      unidade: 'km',
      placeholder: '3',
    },
    CAMPO_TEMPO,
  ],
  natacao: [
    {
      id: 'metros',
      label: 'Quantos metros você nadou?',
      formato: 'inteiro',
      unidade: 'm',
      placeholder: '500',
    },
    CAMPO_TEMPO,
  ],
  meditacao: [{ ...CAMPO_TEMPO, label: 'Por quanto tempo você meditou?' }],
  alongamento: [{ ...CAMPO_TEMPO, label: 'Quanto durou o alongamento?' }],
  yoga: [{ ...CAMPO_TEMPO, label: 'Quanto tempo de prática?' }],
  estudo: [
    {
      id: 'materia',
      label: 'O que você estudou?',
      formato: 'texto',
      placeholder: 'Matéria, concurso, curso...',
    },
    { ...CAMPO_TEMPO, label: 'Por quanto tempo estudou?' },
  ],
  esporte: [
    {
      id: 'modalidade',
      label: 'Qual esporte?',
      formato: 'texto',
      placeholder: 'Futebol, vôlei, basquete...',
    },
    CAMPO_TEMPO,
  ],
  escrita: [
    { id: 'tema', label: 'Sobre o que você escreveu?', formato: 'texto', placeholder: 'Ex.: Diário pessoal' },
    CAMPO_TEMPO,
  ],
  organizacao: [
    { id: 'local', label: 'O que você organizou?', formato: 'texto', placeholder: 'Ex.: Guarda-roupa' },
    CAMPO_TEMPO,
  ],
  generico: [CAMPO_TEMPO],
};

/**
 * Campos do formulário de conclusão de uma atividade específica. Atividades
 * com meta numérica ganham um campo de contagem com a unidade escolhida pelo
 * usuário, além dos campos padrão do tipo.
 */
export function camposParaAtividade(atividade: AtividadeExtra): AtividadeCampo[] {
  const base = ATIVIDADE_CAMPOS[atividade.tipo] ?? ATIVIDADE_CAMPOS.generico;
  if (atividade.meta_tipo !== 'numero') return base;

  const unidade = (atividade.meta_unidade ?? 'vezes').trim() || 'vezes';
  // Tipos que já perguntam uma quantidade própria não ganham campo duplicado.
  const jaTemContagem = base.some((campo) => campo.formato !== 'texto' && campo.id !== 'tempo_min');
  if (jaTemContagem) return base;

  return [
    {
      id: 'quantidade',
      label: `Quantas ${unidade}?`,
      formato: 'inteiro',
      unidade,
      placeholder: String(atividade.meta_valor),
    },
    ...base,
  ];
}

/** Registro salvo no histórico/calendário ao concluir uma atividade. */
export interface AtividadeLog {
  atividade_id: string;
  nome: string;
  icon: AchievementIcon;
  tipo: AtividadeTipo;
  /** Respostas do formulário contextual, por id de campo. */
  metricas: Record<string, number | string>;
  obs?: string;
}

/* ------------------------------------------------------------------ */
/* Catálogo padrão                                                      */
/* ------------------------------------------------------------------ */

export const ATIVIDADES_CATALOGO: AtividadeExtra[] = [
  {
    id: 'atv_leitura',
    nome: 'Leitura',
    descricao: 'Ler pelo menos 5 páginas de um livro.',
    icon: 'star',
    tipo: 'leitura',
    meta_tipo: 'numero',
    meta_valor: 5,
    meta_unidade: 'páginas',
    builtin: true,
  },
  {
    id: 'atv_estudo',
    nome: 'Estudar',
    descricao: 'Estudar um conteúdo que você quer dominar.',
    icon: 'target',
    tipo: 'estudo',
    meta_tipo: 'tempo',
    meta_valor: 30,
    builtin: true,
  },
  {
    id: 'atv_corrida',
    nome: 'Corrida',
    descricao: 'Correr ou trotar, de preferência ao ar livre.',
    icon: 'zap',
    tipo: 'corrida',
    meta_tipo: 'tempo',
    meta_valor: 20,
    builtin: true,
  },
  {
    id: 'atv_caminhada',
    nome: 'Caminhada',
    descricao: 'Caminhar em ritmo leve pra arejar a cabeça.',
    icon: 'sun',
    tipo: 'caminhada',
    meta_tipo: 'tempo',
    meta_valor: 30,
    builtin: true,
  },
  {
    id: 'atv_meditacao',
    nome: 'Meditação',
    descricao: 'Meditar em silêncio ou com áudio guiado.',
    icon: 'moon',
    tipo: 'meditacao',
    meta_tipo: 'tempo',
    meta_valor: 15,
    builtin: true,
  },
  {
    id: 'atv_alongamento',
    nome: 'Alongamento',
    descricao: 'Soltar o corpo com calma, sem forçar.',
    icon: 'heart',
    tipo: 'alongamento',
    meta_tipo: 'tempo',
    meta_valor: 10,
    builtin: true,
  },
  {
    id: 'atv_esporte',
    nome: 'Praticar esporte',
    descricao: 'Futebol, vôlei, basquete — o que você curtir.',
    icon: 'trophy',
    tipo: 'esporte',
    meta_tipo: 'tempo',
    meta_valor: 60,
    builtin: true,
  },
  {
    id: 'atv_pedalada',
    nome: 'Pedalada',
    descricao: 'Andar de bicicleta pelo bairro ou trilha.',
    icon: 'rocket',
    tipo: 'pedalada',
    meta_tipo: 'tempo',
    meta_valor: 30,
    builtin: true,
  },
  {
    id: 'atv_natacao',
    nome: 'Natação',
    descricao: 'Nadar ou brincar na água com intenção.',
    icon: 'droplet',
    tipo: 'natacao',
    meta_tipo: 'tempo',
    meta_valor: 30,
    builtin: true,
  },
  {
    id: 'atv_yoga',
    nome: 'Yoga',
    descricao: 'Uma sequência leve de posturas e respiração.',
    icon: 'sparkles',
    tipo: 'yoga',
    meta_tipo: 'tempo',
    meta_valor: 20,
    builtin: true,
  },
  {
    id: 'atv_diario',
    nome: 'Escrever um diário',
    descricao: 'Anotar como foi o dia e o que você sentiu.',
    icon: 'calendar',
    tipo: 'escrita',
    meta_tipo: 'tempo',
    meta_valor: 10,
    builtin: true,
  },
  {
    id: 'atv_organizacao',
    nome: 'Organizar o espaço',
    descricao: 'Arrumar o quarto ou a mesa de trabalho.',
    icon: 'shield',
    tipo: 'organizacao',
    meta_tipo: 'tempo',
    meta_valor: 15,
    builtin: true,
  },
];

/* ------------------------------------------------------------------ */
/* Sanitização e resolução                                              */
/* ------------------------------------------------------------------ */

const TIPOS_VALIDOS = new Set<string>(Object.keys(ATIVIDADE_TIPO_LABELS));

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitizeAtividade(entry: unknown): AtividadeExtra | null {
  if (!entry || typeof entry !== 'object') return null;
  const item = entry as Partial<AtividadeExtra>;

  const id = String(item.id ?? '').trim();
  if (!id) return null;

  const nome = String(item.nome ?? '')
    .trim()
    .slice(0, ATIVIDADE_NOME_MAX);
  if (nome.length < 2) return null;

  const tipo = (TIPOS_VALIDOS.has(String(item.tipo)) ? item.tipo : 'generico') as AtividadeTipo;
  const metaTipo: AtividadeMetaTipo = item.meta_tipo === 'numero' ? 'numero' : 'tempo';
  const metaValor =
    metaTipo === 'tempo'
      ? clampInt(item.meta_valor, ATIVIDADE_DURACAO_MIN, ATIVIDADE_DURACAO_MAX, 15)
      : clampInt(item.meta_valor, ATIVIDADE_NUMERO_MIN, ATIVIDADE_NUMERO_MAX, 10);

  return {
    id,
    nome,
    descricao: String(item.descricao ?? '')
      .trim()
      .slice(0, ATIVIDADE_DESCRICAO_MAX),
    icon: ATIVIDADE_ICONES.includes(item.icon as AchievementIcon)
      ? (item.icon as AchievementIcon)
      : 'star',
    tipo,
    meta_tipo: metaTipo,
    meta_valor: metaValor,
    ...(metaTipo === 'numero'
      ? { meta_unidade: String(item.meta_unidade ?? 'vezes').trim().slice(0, 20) || 'vezes' }
      : {}),
    ...(item.builtin ? { builtin: true } : {}),
  };
}

/** Normaliza a lista salva no JSONB — nunca confia no shape cru. */
export function sanitizeAtividades(raw: unknown): AtividadeExtra[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: AtividadeExtra[] = [];
  for (const entry of raw) {
    const atividade = sanitizeAtividade(entry);
    if (!atividade || seen.has(atividade.id)) continue;
    seen.add(atividade.id);
    result.push(atividade);
    if (result.length >= ATIVIDADES_MAX) break;
  }
  return result;
}

/**
 * Lista de atividades do usuário, na ordem escolhida por ele. Enquanto ele
 * não mexer em nada (campo nunca salvo, `undefined`), é o catálogo padrão;
 * depois vira a lista salva, mesmo que o usuário tenha apagado tudo (lista
 * vazia de propósito) — checar por `undefined`, não por `.length > 0`, é o
 * que diferencia os dois casos. Bug real corrigido aqui: excluir todas as
 * atividades de uma vez salvava `atividades: []`, e o `.length > 0` fazia
 * isso cair de volta pro catálogo padrão — parecendo que nada tinha sido
 * apagado.
 */
export function resolveAtividades(preferencias?: UserPreferencias | null): AtividadeExtra[] {
  if (preferencias?.atividades !== undefined) {
    return sanitizeAtividades(preferencias.atividades);
  }
  return ATIVIDADES_CATALOGO.map((a) => ({ ...a }));
}

export function findAtividade(
  preferencias: UserPreferencias | null | undefined,
  id: string,
): AtividadeExtra | null {
  return resolveAtividades(preferencias).find((a) => a.id === id) ?? null;
}

/* ------------------------------------------------------------------ */
/* Fila do dia e agendamento                                            */
/* ------------------------------------------------------------------ */

/** Fila de atividades do dia — some sozinha quando a data vira. */
export interface AtividadesFila {
  /** `YYYY-MM-DD` (America/Sao_Paulo) do dia da fila. */
  data: string;
  ids: string[];
}

export function resolveFila(
  preferencias: UserPreferencias | null | undefined,
  hoje: string,
): string[] {
  const fila = preferencias?.atividades_fila as AtividadesFila | undefined;
  if (!fila || typeof fila !== 'object' || fila.data !== hoje) return [];
  if (!Array.isArray(fila.ids)) return [];
  const validas = new Set(resolveAtividades(preferencias).map((a) => a.id));
  return fila.ids.map((id) => String(id)).filter((id) => validas.has(id));
}

export type AtividadesAgendaModo = 'todos_dias' | 'dias_especificos';

export interface AtividadesAgenda {
  modo: AtividadesAgendaModo;
  /** Dias da semana (0=Dom..6=Sáb) quando `modo` = 'dias_especificos'. */
  dias: number[];
  /** true = entram no mesmo fluxo do treino; false = ficam separadas. */
  junto_com_treino: boolean;
}

export const DEFAULT_ATIVIDADES_AGENDA: AtividadesAgenda = {
  modo: 'todos_dias',
  dias: [],
  junto_com_treino: false,
};

export function resolveAgenda(preferencias?: UserPreferencias | null): AtividadesAgenda {
  const raw = preferencias?.atividades_agenda as Partial<AtividadesAgenda> | undefined;
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_ATIVIDADES_AGENDA };
  return {
    modo: raw.modo === 'dias_especificos' ? 'dias_especificos' : 'todos_dias',
    dias: Array.isArray(raw.dias)
      ? [...new Set(raw.dias.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))]
      : [],
    junto_com_treino: raw.junto_com_treino === true,
  };
}

/** As atividades valem pra este dia da semana, segundo o agendamento? */
export function agendaCobreDia(agenda: AtividadesAgenda, weekday: number): boolean {
  if (agenda.modo === 'todos_dias') return true;
  return agenda.dias.includes(weekday);
}

/* ------------------------------------------------------------------ */
/* Regras de XP/streak                                                  */
/* ------------------------------------------------------------------ */

/** Prefixo que identifica uma sessão de atividade no histórico de treinos. */
export const ATIVIDADE_HISTORY_PREFIX = 'Atividade: ';

export function nomeHistoricoAtividade(nome: string): string {
  return `${ATIVIDADE_HISTORY_PREFIX}${nome}`;
}

export function isAtividadeHistory(treinoNome?: string | null): boolean {
  return typeof treinoNome === 'string' && treinoNome.startsWith(ATIVIDADE_HISTORY_PREFIX);
}

/**
 * Dia de treino = o perfil tem dias fixos e este weekday é um deles.
 * Sem dias fixos configurados, todo dia é tratado como flexível (descanso),
 * então as atividades podem sustentar a streak.
 */
export function isDiaDeTreino(diasSemana: number[] | null | undefined, weekday: number): boolean {
  return Array.isArray(diasSemana) && diasSemana.length > 0 && diasSemana.includes(weekday);
}
