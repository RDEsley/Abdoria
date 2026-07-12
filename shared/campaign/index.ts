/**
 * Motor do Mapa da Campanha narrativo: deriva posts de roleplay do histórico
 * de treinos, deterministicamente (mesma sessão → mesma história). Roda no
 * client; nada é persistido.
 *
 * Pools sensíveis a progresso: inimigos nomeados só depois de descobertos no
 * Bestiário (fallback genérico antes disso) e lugares revelados por nível.
 * Quando um pool cresce, posts antigos podem re-sortear — aceito por design
 * (raro e inofensivo; evita persistir narrativa).
 */

import { AFK_ENEMIES, type AfkEnemyId } from '../afk/combat.js';
import { bestiaryEnemyTier, isBestiaryEnemyId } from '../afk/bestiary.js';
import { resolveExerciseNomePt } from '../types/exercise-display.js';
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

/** Mínimo de exercícios numa sessão pra gerar o post agregado "vila salva". */
export const CAMPAIGN_SESSION_POST_MIN_EXERCISES = 3;

/** Inimigos genéricos pra conta sem descobertas no Bestiário. */
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
  modo?: string;
}

export interface CampaignSession {
  id: string;
  treino_nome: string;
  exercicios: CampaignExerciseEntry[];
  duracao_total_segundos?: number;
  xp_ganho?: number;
  concluido_em: string | Date;
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
  bestiarioDesbloqueados: AfkEnemyId[];
}

export interface CampaignPost {
  id: string;
  tipo: CampaignEventType;
  tipo_label: string;
  lugar: string;
  mensagem: string;
  exercicio?: { slug: string; nome: string; detalhe: string };
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

/**
 * Classifica o exercício num tipo de evento. Regras por característica do
 * catálogo (não por slug) — exercícios futuros já nascem narráveis.
 */
export function classifyExercise(info: CampaignCatalogInfo | undefined): CampaignEventType {
  if (!info) return 'monstro_derrotado';
  const grupos = info.grupos ?? [];
  const principal = grupos[0];

  if (info.nivel === 4) return 'chefe_derrotado';
  if (info.prioridade === 'isometrico') {
    return info.musculo_principal === 'core' ? 'poder_desperto' : 'defesa_heroica';
  }
  if (principal === 'costas') return 'pessoa_resgatada';
  if (principal === 'pernas' || principal === 'gluteos') return 'travessia';
  if (principal === 'peito' || principal === 'ombros' || principal === 'bracos') {
    return 'fortaleza_rompida';
  }
  if (info.prioridade === 'dinamico') return 'horda_contida';
  return 'monstro_derrotado';
}

/** Tipos sem pool de templates ainda (Lotes 2+) caem no vizinho narrativo. */
const TEMPLATE_FALLBACK: Partial<Record<CampaignEventType, CampaignEventType>> = {
  defesa_heroica: 'monstro_derrotado',
  poder_desperto: 'monstro_derrotado',
  travessia: 'horda_contida',
  fortaleza_rompida: 'horda_contida',
  capitulo: 'vila_salva',
};

function templatesForTipo(tipo: CampaignEventType): {
  tipo: CampaignEventType;
  pool: CampaignTemplate[];
} {
  const direct = CAMPAIGN_TEMPLATES.filter((t) => t.tipo === tipo);
  if (direct.length > 0) return { tipo, pool: direct };
  const fallback = TEMPLATE_FALLBACK[tipo] ?? 'monstro_derrotado';
  return { tipo: fallback, pool: CAMPAIGN_TEMPLATES.filter((t) => t.tipo === fallback) };
}

function enemyPools(ctx: CampaignContext): { comuns: string[]; chefes: string[] } {
  const descobertos = (ctx.bestiarioDesbloqueados ?? []).filter(isBestiaryEnemyId);
  const comuns: string[] = [];
  const chefes: string[] = [];
  for (const id of descobertos) {
    const label = AFK_ENEMIES[id]?.label;
    if (!label) continue;
    if (bestiaryEnemyTier(id) === 'boss') chefes.push(label);
    else comuns.push(label);
  }
  return {
    comuns: comuns.length > 0 ? comuns : CAMPAIGN_GENERIC_ENEMIES,
    chefes: chefes.length > 0 ? chefes : [CAMPAIGN_GENERIC_BOSS],
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

function interpolate(texto: string, valores: Record<string, string>): string {
  return texto.replace(/\{(\w+)\}/g, (raw, chave: string) => valores[chave] ?? raw);
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
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
 * Deriva os posts do feed a partir das sessões (mais recentes primeiro).
 * `catalogBySlug` vem do catálogo de exercícios já carregado no client.
 */
export function buildCampaignPosts(
  sessions: CampaignSession[],
  catalogBySlug: Map<string, CampaignCatalogInfo>,
  ctx: CampaignContext,
): CampaignPost[] {
  const lugares = placesForLevel(ctx.level);
  const inimigos = enemyPools(ctx);
  const posts: CampaignPost[] = [];
  const recentTemplates: string[] = [];
  const recentPlaces: string[] = [];

  const ordered = [...sessions].sort(
    (a, b) => new Date(b.concluido_em).getTime() - new Date(a.concluido_em).getTime(),
  );

  for (const session of ordered) {
    const concluidoEm = toIso(session.concluido_em);
    const sessionHash = hashString(String(session.id));

    // Post agregado da sessão (vila salva) — abre o "dia" no feed.
    if (session.exercicios.length >= CAMPAIGN_SESSION_POST_MIN_EXERCISES) {
      const { tipo, pool } = templatesForTipo('vila_salva');
      const template = pickAvoiding(pool, sessionHash, recentTemplates, (t) => t.id);
      const lugarDaSessao = pickAvoiding(lugares, sessionHash, recentPlaces, (p) => p.id);
      remember(recentTemplates, template.id, RECENT_TEMPLATES_WINDOW);
      remember(recentPlaces, lugarDaSessao.id, RECENT_PLACES_WINDOW);
      posts.push({
        id: `${session.id}:sessao`,
        tipo,
        tipo_label: CAMPAIGN_EVENT_LABELS[tipo],
        lugar: lugarDaSessao.nome,
        mensagem: interpolate(template.texto, {
          heroi: ctx.heroi,
          ...lugarPlaceholders(lugarDaSessao),
          feitos: String(session.exercicios.length),
          minutos: String(Math.max(1, Math.round((session.duracao_total_segundos ?? 0) / 60))),
          xp: String(session.xp_ganho ?? 0),
        }),
        xp: session.xp_ganho,
        concluido_em: concluidoEm,
        session_id: String(session.id),
      });
    }

    session.exercicios.forEach((entry, index) => {
      const seed = hashString(`${session.id}:${entry.slug}:${index}`);
      const info = catalogBySlug.get(entry.slug);
      const { tipo, pool } = templatesForTipo(classifyExercise(info));
      const template = pickAvoiding(pool, seed, recentTemplates, (t) => t.id);
      const lugar = pickAvoiding(lugares, seed, recentPlaces, (p) => p.id);
      remember(recentTemplates, template.id, RECENT_TEMPLATES_WINDOW);
      remember(recentPlaces, lugar.id, RECENT_PLACES_WINDOW);
      const nome =
        resolveExerciseNomePt({ slug: entry.slug, nome_pt: info?.nome_pt }) ?? entry.nome;
      const detalhe = detalheDoExercicio(entry);

      const inimigo =
        template.inimigo === 'chefe'
          ? pick(inimigos.chefes, seed)
          : template.inimigo === 'comum'
            ? pick(inimigos.comuns, seed)
            : '';

      posts.push({
        id: `${session.id}:${index}`,
        tipo,
        tipo_label: CAMPAIGN_EVENT_LABELS[tipo],
        lugar: lugar.nome,
        mensagem: interpolate(template.texto, {
          heroi: ctx.heroi,
          exercicio: nome,
          detalhe,
          inimigo,
          ...lugarPlaceholders(lugar),
        }),
        exercicio: { slug: entry.slug, nome, detalhe },
        concluido_em: concluidoEm,
        session_id: String(session.id),
      });
    });
  }

  return posts;
}
