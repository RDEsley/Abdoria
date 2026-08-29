/**
 * Motor do Mapa da Campanha narrativo: deriva UM post por sessão de treino
 * (não por exercício) — a sessão é a "missão do dia", como uma daily
 * quest. Roda no client; nada é persistido; determinístico (mesma sessão →
 * mesma história).
 *
 * Quando a sessão tem mais de um feito notável, uma hierarquia de
 * prioridade (por raridade narrativa) escolhe qual evento vira a história:
 * capítulo (marco) > chefe (PR real) > chefe (nível 4, sinal secundário) >
 * resgate > poder desperto > defesa heroica > fortaleza > travessia >
 * horda > missão cumprida (volume) > monstro (piso).
 *
 * Os lugares são revelados por nível e os encontros usam um catálogo narrativo
 * próprio e independente de outros modos de jogo.
 */

import { resolveExerciseNomePt } from '../types/exercise-display.js';
import { computePersonalRecords, diffNewPersonalRecords } from '../personal-records.js';
import type { ModoExercicio } from '../types/index.js';
import {
  CAMPAIGN_EVENT_LABELS,
  CAMPAIGN_TEMPLATES,
  type CampaignEventType,
  type CampaignTemplate,
} from './templates.js';
import { placesForLevel, type CampaignPlace } from './places.js';

export { CAMPAIGN_EVENT_LABELS, CAMPAIGN_TEMPLATES } from './templates.js';
export type { CampaignEventType, CampaignTemplate } from './templates.js';
export * from './places.js';

/** Mínimo de exercícios pra "missão cumprida" vencer por volume (tier 10). */
export const CAMPAIGN_VILA_SALVA_MIN_EXERCISES = 5;

/** Todos os marcos de streak — mesmos thresholds das conquistas (streak_N), intocado. */
export const CAMPAIGN_STREAK_MILESTONES = [2, 3, 7, 14, 30, 60, 100, 365];

/**
 * Piso pra um marco de streak virar "capítulo" (prioridade máxima) na
 * Campanha. Marcos abaixo disso (2, 3) já são celebrados pelo sistema de
 * conquistas (toast/XP) e cedem a narrativa do dia pro treino em si — a
 * primeira semana de conta nova é o período mais importante pra mostrar
 * variedade, não virar contador de dias.
 */
export const CAMPAIGN_STREAK_NARRATIVE_MIN = 7;

/** Encontros narrativos genéricos da campanha. */
export const CAMPAIGN_GENERIC_ENEMIES = [
  'um vulto das brumas',
  'uma fera sem nome',
  'uma sombra da estrada',
  'uma criatura rastejante',
];

export const CAMPAIGN_GENERIC_BOSS = 'um chefe ainda sem nome nas lendas';

export interface CampaignExerciseEntry {
  slug: string;
  nome: string;
  series?: number;
  repeticoes_realizadas?: number;
  duracao_segundos?: number;
  modo?: ModoExercicio;
}

export interface CampaignSession {
  id: string;
  treino_nome: string;
  exercicios: CampaignExerciseEntry[];
  duracao_total_segundos?: number;
  xp_ganho?: number;
  concluido_em: string | Date;
  /** true = dia de Atividades (sem exercícios) — narrado como missão pessoal, não combate. */
  isAtividade?: boolean;
  /** Só quando isAtividade: nome + detalhe de cada atividade feita naquele dia. */
  atividadesFeitas?: { nome: string; detalhe: string }[];
}

/** Recorte do catálogo usado pra classificar o exercício. */
export interface CampaignCatalogInfo {
  nivel?: number;
  prioridade?: string;
  musculo_principal?: string;
  grupos?: string[];
  nome_pt?: string;
}

export interface CampaignContext {
  heroi: string;
  level: number;
}

export interface CampaignExerciseSummary {
  slug: string;
  nome: string;
  detalhe: string;
}

export interface CampaignPost {
  id: string;
  tipo: CampaignEventType;
  tipo_label: string;
  lugar: string;
  mensagem: string;
  exercicio?: CampaignExerciseSummary;
  /** Demais exercícios da sessão (todos, exceto `exercicio`) — exibição secundária/discreta. */
  outros_exercicios: CampaignExerciseSummary[];
  xp?: number;
  concluido_em: string;
  session_id: string;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pick<T>(pool: readonly T[], hash: number): T {
  return pool[hash % pool.length];
}

/** Singular/plural simples — toda contagem no feed passa por aqui. */
function contagem(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

// —— Hierarquia de prioridade (menor número = maior prioridade) ————————————
// Baseada em raridade narrativa: quanto mais raro o feito, mais ele merece
// ser a história do dia — evita que eventos comuns afoguem os raros.
const PRIORITY = {
  CAPITULO: 0,
  CHEFE_PR: 1,
  CHEFE_NIVEL4: 2,
  RESGATE: 3,
  PODER: 4,
  DEFESA: 5,
  FORTALEZA: 6,
  TRAVESSIA: 7,
  HORDA: 8,
  VILA_SALVA: 9,
  MONSTRO: 10,
} as const;

const PRIORIDADE_CATALOGO_RANK: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };

interface ExerciseCandidate {
  entry: CampaignExerciseEntry;
  info: CampaignCatalogInfo | undefined;
  index: number;
  priority: number;
  tipo: CampaignEventType;
}

/**
 * Classifica um exercício em (tipo de evento, prioridade), dado se ele bateu
 * PR real nesta sessão. Não decide sozinho o vencedor — isso é
 * `pickSessionWinner`, que compara todos os exercícios da sessão.
 */
function classifyCandidate(
  entry: CampaignExerciseEntry,
  info: CampaignCatalogInfo | undefined,
  index: number,
  hitPr: boolean,
): ExerciseCandidate {
  if (hitPr) return { entry, info, index, priority: PRIORITY.CHEFE_PR, tipo: 'chefe_derrotado' };
  if (info?.nivel === 4) {
    return { entry, info, index, priority: PRIORITY.CHEFE_NIVEL4, tipo: 'chefe_derrotado' };
  }

  const grupos = info?.grupos ?? [];
  const principal = grupos[0];

  if (info?.prioridade === 'isometrico') {
    const tipo = info.musculo_principal === 'core' ? 'poder_desperto' : 'defesa_heroica';
    const priority = tipo === 'poder_desperto' ? PRIORITY.PODER : PRIORITY.DEFESA;
    return { entry, info, index, priority, tipo };
  }
  if (principal === 'costas') {
    return { entry, info, index, priority: PRIORITY.RESGATE, tipo: 'pessoa_resgatada' };
  }
  if (principal === 'peito' || principal === 'ombros' || principal === 'bracos') {
    return { entry, info, index, priority: PRIORITY.FORTALEZA, tipo: 'fortaleza_rompida' };
  }
  if (principal === 'pernas' || principal === 'gluteos') {
    return { entry, info, index, priority: PRIORITY.TRAVESSIA, tipo: 'travessia' };
  }
  if (info?.prioridade === 'dinamico') {
    return { entry, info, index, priority: PRIORITY.HORDA, tipo: 'horda_contida' };
  }
  return { entry, info, index, priority: PRIORITY.MONSTRO, tipo: 'monstro_derrotado' };
}

/** Desempate entre candidatos empatados na mesma prioridade. */
function compareCandidates(a: ExerciseCandidate, b: ExerciseCandidate): number {
  const nivelDiff = (b.info?.nivel ?? 0) - (a.info?.nivel ?? 0);
  if (nivelDiff !== 0) return nivelDiff;
  const rankA = PRIORIDADE_CATALOGO_RANK[a.info?.prioridade ?? ''] ?? 9;
  const rankB = PRIORIDADE_CATALOGO_RANK[b.info?.prioridade ?? ''] ?? 9;
  if (rankA !== rankB) return rankA - rankB;
  return a.index - b.index;
}

export type CapituloMarco = { tipo: 'primeiro' } | { tipo: 'streak'; dias: number };

interface SessionWinner {
  tipo: CampaignEventType;
  candidate: ExerciseCandidate | null;
  /** Só em capitulo: qual marco narrar. */
  marco?: CapituloMarco;
}

function pickSessionWinner(
  session: CampaignSession,
  catalogBySlug: Map<string, CampaignCatalogInfo>,
  prSlugs: Set<string>,
  capituloMarco: SessionWinner['marco'] | undefined,
): SessionWinner {
  if (capituloMarco) return { tipo: 'capitulo', candidate: null, marco: capituloMarco };

  const candidates = session.exercicios.map((entry, index) =>
    classifyCandidate(entry, catalogBySlug.get(entry.slug), index, prSlugs.has(entry.slug)),
  );

  const best = candidates.reduce<ExerciseCandidate | null>((acc, cur) => {
    if (!acc) return cur;
    if (cur.priority !== acc.priority) return cur.priority < acc.priority ? cur : acc;
    return compareCandidates(cur, acc) < 0 ? cur : acc;
  }, null);

  if (!best || best.priority === PRIORITY.MONSTRO) {
    if (session.exercicios.length >= CAMPAIGN_VILA_SALVA_MIN_EXERCISES) {
      return { tipo: 'vila_salva', candidate: null };
    }
  }

  return best
    ? { tipo: best.tipo, candidate: best }
    : { tipo: 'monstro_derrotado', candidate: null };
}

function templatesForTipo(
  tipo: CampaignEventType,
  marco?: SessionWinner['marco'],
): CampaignTemplate[] {
  if (tipo === 'capitulo') {
    return CAMPAIGN_TEMPLATES.filter((t) => t.tipo === 'capitulo' && t.marco === marco?.tipo);
  }
  const direct = CAMPAIGN_TEMPLATES.filter((t) => t.tipo === tipo);
  // Defensivo: tipo sem pool (não deve acontecer com os 10 tipos completos).
  return direct.length > 0
    ? direct
    : CAMPAIGN_TEMPLATES.filter((t) => t.tipo === 'monstro_derrotado');
}

function enemyPools(_ctx: CampaignContext): { comuns: string[]; chefes: string[] } {
  return {
    comuns: CAMPAIGN_GENERIC_ENEMIES,
    chefes: [CAMPAIGN_GENERIC_BOSS],
  };
}

function detalheDoExercicio(entry: CampaignExerciseEntry): string {
  if (entry.modo === 'tempo') {
    return `${Math.max(1, Math.round(entry.duracao_segundos ?? 30))}s`;
  }
  const series = entry.series ?? 3;
  const reps = entry.repeticoes_realizadas ?? 12;
  return `${series}×${reps}`;
}

const CONTRACOES: Record<CampaignPlace['artigo'], { em: string; de: string; por: string }> = {
  o: { em: 'no', de: 'do', por: 'pelo' },
  a: { em: 'na', de: 'da', por: 'pela' },
  os: { em: 'nos', de: 'dos', por: 'pelos' },
  as: { em: 'nas', de: 'das', por: 'pelas' },
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Placeholders do lugar com concordância de artigo ("no Bosque", "da Vila"…). */
function lugarPlaceholders(place: CampaignPlace): Record<string, string> {
  const c = CONTRACOES[place.artigo];
  const oLugar = `${place.artigo} ${place.nome}`;
  const noLugar = `${c.em} ${place.nome}`;
  const doLugar = `${c.de} ${place.nome}`;
  const peloLugar = `${c.por} ${place.nome}`;
  return {
    lugar: place.nome,
    o_lugar: oLugar,
    O_lugar: capitalize(oLugar),
    no_lugar: noLugar,
    No_lugar: capitalize(noLugar),
    do_lugar: doLugar,
    Do_lugar: capitalize(doLugar),
    pelo_lugar: peloLugar,
    Pelo_lugar: capitalize(peloLugar),
  };
}

function interpolate(texto: string, valores: Record<string, string>): string {
  return texto.replace(/\{(\w+)\}/g, (raw, chave: string) => valores[chave] ?? raw);
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** Chave de dia (YYYY-MM-DD) a partir do ISO — aproximação de calendário local. */
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function addOneDay(key: string): string {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Marcos de capítulo por sessão: 'primeiro' pra sessão mais antiga da conta
 * (sempre), 'streak' pro dia em que a sequência de dias-com-treino bate um
 * marco de conquista >= CAMPAIGN_STREAK_NARRATIVE_MIN (marcos menores, 2 e
 * 3, competem normalmente na hierarquia — já são celebrados por outro
 * sistema). Aproximação por calendário — não usa proteção de Frozen Streak
 * (cosmético, não afeta jogo).
 */
function computeCapituloMarcos(
  sessionsAscending: CampaignSession[],
): Map<string, SessionWinner['marco']> {
  const marcos = new Map<string, SessionWinner['marco']>();
  if (sessionsAscending.length === 0) return marcos;

  marcos.set(String(sessionsAscending[0].id), { tipo: 'primeiro' });

  const daysWithSession = new Map<string, string>(); // dayKey -> last session id of that day
  for (const session of sessionsAscending) {
    daysWithSession.set(dayKey(toIso(session.concluido_em)), String(session.id));
  }
  const sortedDays = [...daysWithSession.keys()].sort();

  let streak = 0;
  let prevDay: string | null = null;
  for (const day of sortedDays) {
    streak = prevDay && addOneDay(prevDay) === day ? streak + 1 : 1;
    prevDay = day;
    if (streak >= CAMPAIGN_STREAK_NARRATIVE_MIN && CAMPAIGN_STREAK_MILESTONES.includes(streak)) {
      const sessionId = daysWithSession.get(day)!;
      // 1º treino já venceu por 'primeiro' — não sobrescreve com streak no mesmo dia.
      if (!marcos.has(sessionId)) {
        marcos.set(sessionId, { tipo: 'streak', dias: streak });
      }
    }
  }

  return marcos;
}

/** PRs batidos em cada sessão, usando o mesmo cálculo de `shared/personal-records.ts`. */
function computeSessionPrSlugs(sessionsAscending: CampaignSession[]): Map<string, Set<string>> {
  const bySession = new Map<string, Set<string>>();
  const seenHistories: CampaignSession[] = [];
  for (const session of sessionsAscending) {
    const previousRecords = computePersonalRecords(seenHistories);
    const notices = diffNewPersonalRecords(previousRecords, session.exercicios);
    bySession.set(String(session.id), new Set(notices.map((n) => n.slug)));
    seenHistories.push(session);
  }
  return bySession;
}

/**
 * Escolha determinística que evita repetir os itens recentes: avança no pool
 * a partir do seed até achar candidato fora da lista, sem sorteio real.
 */
function pickAvoiding<T>(
  pool: readonly T[],
  hash: number,
  recent: string[],
  keyOf: (item: T) => string,
): T {
  for (let offset = 0; offset < pool.length; offset += 1) {
    const candidate = pool[(hash + offset) % pool.length];
    if (!recent.includes(keyOf(candidate))) return candidate;
  }
  return pool[hash % pool.length];
}

function remember(recent: string[], key: string, max: number): void {
  recent.push(key);
  if (recent.length > max) recent.shift();
}

/** Posts vizinhos não repetem template (janela 4) nem lugar (janela 2). */
const RECENT_TEMPLATES_WINDOW = 4;
const RECENT_PLACES_WINDOW = 2;

/**
 * Deriva o feed a partir das sessões: exatamente 1 post por sessão de
 * treino (a "missão do dia"), escolhido pela hierarquia de prioridade.
 * `catalogBySlug` vem do catálogo de exercícios já carregado no client.
 */
/** Post de um dia de Atividades — sem exercícios pra classificar, então não
    passa pela hierarquia de combate: vai direto pro pool `missao_pessoal`. */
function buildAtividadePost(
  session: CampaignSession,
  ctx: CampaignContext,
  lugares: readonly CampaignPlace[],
  recentTemplates: string[],
  recentPlaces: string[],
): CampaignPost {
  const id = String(session.id);
  const seed = hashString(id);
  const pool = CAMPAIGN_TEMPLATES.filter((t) => t.tipo === 'missao_pessoal');
  const template = pickAvoiding(pool, seed, recentTemplates, (t) => t.id);
  const lugar = pickAvoiding(lugares, seed, recentPlaces, (p) => p.id);
  remember(recentTemplates, template.id, RECENT_TEMPLATES_WINDOW);
  remember(recentPlaces, lugar.id, RECENT_PLACES_WINDOW);

  const feitas = session.atividadesFeitas ?? [];
  const principal = feitas[0];
  const valores: Record<string, string> = {
    heroi: ctx.heroi,
    ...lugarPlaceholders(lugar),
    exercicio: principal?.nome ?? 'atividades pessoais',
    detalhe: principal?.detalhe ?? '',
  };

  const outrosExercicios: CampaignExerciseSummary[] = feitas.slice(1).map((a, i) => ({
    slug: `atividade-${i}`,
    nome: a.nome,
    detalhe: a.detalhe,
  }));

  return {
    id,
    tipo: 'missao_pessoal',
    tipo_label: CAMPAIGN_EVENT_LABELS.missao_pessoal,
    lugar: lugar.nome,
    mensagem: interpolate(template.texto, valores),
    exercicio: principal
      ? { slug: 'atividade-principal', nome: principal.nome, detalhe: principal.detalhe }
      : undefined,
    outros_exercicios: outrosExercicios,
    xp: session.xp_ganho,
    concluido_em: toIso(session.concluido_em),
    session_id: id,
  };
}

/**
 * Override explícito de marco de capítulo pra UMA sessão — usado por quem só
 * enxerga a sessão do dia isolada (telas de role play pós-treino/atividades),
 * sem o histórico completo pra deixar `computeCapituloMarcos` decidir sozinho
 * (que trataria a única sessão da lista como se fosse sempre a primeira da
 * conta). Quando fornecido (mesmo `null`), substitui o auto-detect por
 * completo — assim a sessão só vira "capítulo" quando o chamador confirma
 * (via streak real do servidor) que o marco é genuíno.
 */
export interface CapituloOverride {
  sessionId: string;
  marco: CapituloMarco;
}

export function buildCampaignPosts(
  sessions: CampaignSession[],
  catalogBySlug: Map<string, CampaignCatalogInfo>,
  ctx: CampaignContext,
  capituloOverride?: CapituloOverride | null,
): CampaignPost[] {
  const validSessions = sessions.filter((s) => s.exercicios.length > 0 || s.isAtividade);
  const ascending = [...validSessions].sort(
    (a, b) => new Date(a.concluido_em).getTime() - new Date(b.concluido_em).getTime(),
  );
  const prSlugsBySession = computeSessionPrSlugs(ascending);
  // `undefined` = parâmetro omitido (chamador quer o auto-detect de sempre,
  // baseado no histórico completo). `null` explícito = chamador confirmou
  // que NENHUM marco se aplica agora — não cai no auto-detect (que trataria
  // a sessão isolada como se fosse sempre a primeira da conta).
  const capituloMarcos =
    capituloOverride !== undefined
      ? new Map<string, CapituloMarco>(
          capituloOverride ? [[capituloOverride.sessionId, capituloOverride.marco]] : [],
        )
      : computeCapituloMarcos(ascending);

  const lugares = placesForLevel(ctx.level);
  const inimigos = enemyPools(ctx);
  const recentTemplates: string[] = [];
  const recentPlaces: string[] = [];

  const descending = [...ascending].reverse();
  const posts: CampaignPost[] = [];

  for (const session of descending) {
    const id = String(session.id);

    // Dia de Atividades sem marco de capítulo: não passa pela hierarquia de
    // combate (não tem `exercicios` pra classificar) — vira missão pessoal.
    // Com marco (primeiro dia da conta / streak), o capítulo prevalece
    // normalmente, já que essa classificação não depende de `exercicios`.
    if (session.isAtividade && !capituloMarcos.get(id)) {
      posts.push(buildAtividadePost(session, ctx, lugares, recentTemplates, recentPlaces));
      continue;
    }

    const concluidoEm = toIso(session.concluido_em);
    const seed = hashString(id);

    const winner = pickSessionWinner(
      session,
      catalogBySlug,
      prSlugsBySession.get(id) ?? new Set(),
      capituloMarcos.get(id),
    );

    const pool = templatesForTipo(winner.tipo, winner.marco);
    const template = pickAvoiding(pool, seed, recentTemplates, (t) => t.id);
    const lugar = pickAvoiding(lugares, seed, recentPlaces, (p) => p.id);
    remember(recentTemplates, template.id, RECENT_TEMPLATES_WINDOW);
    remember(recentPlaces, lugar.id, RECENT_PLACES_WINDOW);

    const valores: Record<string, string> = {
      heroi: ctx.heroi,
      ...lugarPlaceholders(lugar),
    };

    let exercicioInfo: CampaignPost['exercicio'];
    if (winner.candidate) {
      const info = winner.candidate.info;
      const entry = winner.candidate.entry;
      const nome =
        resolveExerciseNomePt({ slug: entry.slug, nome_pt: info?.nome_pt }) ?? entry.nome;
      const detalhe = detalheDoExercicio(entry);
      valores.exercicio = nome;
      valores.detalhe = detalhe;
      exercicioInfo = { slug: entry.slug, nome, detalhe };

      if (template.inimigo === 'chefe') valores.inimigo = pick(inimigos.chefes, seed);
      else if (template.inimigo === 'comum') valores.inimigo = pick(inimigos.comuns, seed);
    } else if (session.isAtividade) {
      // Capítulo (marco) num dia de Atividades: não tem exercício-destaque
      // pra classificar, mas ainda vale mencionar o que foi feito no dia —
      // só como chip informativo, a narrativa do marco não muda.
      const [principal] = session.atividadesFeitas ?? [];
      if (principal) {
        exercicioInfo = {
          slug: 'atividade-principal',
          nome: principal.nome,
          detalhe: principal.detalhe,
        };
      }
    }

    // Demais exercícios/atividades da sessão (exclui só o índice do vencedor,
    // se houver um exercício-destaque) — puramente informativo, não influencia
    // a narrativa.
    const winnerIndex = winner.candidate?.index;
    const outrosExercicios: CampaignExerciseSummary[] = session.isAtividade
      ? (session.atividadesFeitas ?? [])
          .slice(exercicioInfo ? 1 : 0)
          .map((a, idx) => ({ slug: `atividade-extra-${idx}`, nome: a.nome, detalhe: a.detalhe }))
      : session.exercicios
          .map((entry, idx) => ({ entry, idx }))
          .filter(({ idx }) => idx !== winnerIndex)
          .map(({ entry }) => {
            const info = catalogBySlug.get(entry.slug);
            const nome =
              resolveExerciseNomePt({ slug: entry.slug, nome_pt: info?.nome_pt }) ?? entry.nome;
            return { slug: entry.slug, nome, detalhe: detalheDoExercicio(entry) };
          });

    if (winner.tipo === 'vila_salva') {
      valores.feitos = contagem(session.exercicios.length, 'feito');
      valores.minutos = contagem(
        Math.max(1, Math.round((session.duracao_total_segundos ?? 0) / 60)),
        'minuto',
      );
      valores.xp = String(session.xp_ganho ?? 0);
    }

    if (winner.tipo === 'capitulo' && winner.marco?.tipo === 'streak') {
      valores.dias = contagem(winner.marco.dias, 'dia');
      valores.n_dias = String(winner.marco.dias);
    }

    posts.push({
      id,
      tipo: winner.tipo,
      tipo_label: CAMPAIGN_EVENT_LABELS[winner.tipo],
      lugar: lugar.nome,
      mensagem: interpolate(template.texto, valores),
      exercicio: exercicioInfo,
      outros_exercicios: outrosExercicios,
      xp: winner.tipo === 'vila_salva' ? session.xp_ganho : undefined,
      concluido_em: concluidoEm,
      session_id: id,
    });
  }

  return posts;
}
