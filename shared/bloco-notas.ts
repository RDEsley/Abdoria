import type { UserPreferencias } from './types/index.js';

/**
 * Bloco de Notas: lista de tarefas livre da seção Atividades — não é sobre
 * bem-estar/XP como as Atividades, é uma lista de qualquer coisa que o
 * jogador queira anotar (afazeres do dia, lista de compras, lembretes...).
 * Sem XP/streak — a recompensa aqui é só a satisfação de riscar o item.
 */
export interface NotaItem {
  id: string;
  texto: string;
  feita: boolean;
  criada_em: string;
  concluida_em?: string;
}

export const NOTA_TEXTO_MAX = 140;
/** Teto de itens — evita que o JSONB de preferências cresça sem limite. */
export const BLOCO_NOTAS_MAX = 60;
export const BLOCO_NOTAS_LIMITE_MSG =
  'Limite de itens atingido. Limpe alguns para adicionar outros.';

function sanitizeNota(entry: unknown): NotaItem | null {
  if (!entry || typeof entry !== 'object') return null;
  const item = entry as Partial<NotaItem>;

  const id = String(item.id ?? '').trim();
  if (!id) return null;

  const texto = String(item.texto ?? '')
    .trim()
    .slice(0, NOTA_TEXTO_MAX);
  if (!texto) return null;

  return {
    id,
    texto,
    feita: item.feita === true,
    criada_em: typeof item.criada_em === 'string' ? item.criada_em : new Date().toISOString(),
    ...(typeof item.concluida_em === 'string' ? { concluida_em: item.concluida_em } : {}),
  };
}

/** Normaliza a lista salva no JSONB — nunca confia no shape cru. */
export function sanitizeBlocoNotas(raw: unknown): NotaItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: NotaItem[] = [];
  for (const entry of raw) {
    const nota = sanitizeNota(entry);
    if (!nota || seen.has(nota.id)) continue;
    seen.add(nota.id);
    result.push(nota);
    if (result.length >= BLOCO_NOTAS_MAX) break;
  }
  return result;
}

export function resolveBlocoNotas(preferencias?: UserPreferencias | null): NotaItem[] {
  return sanitizeBlocoNotas(preferencias?.bloco_notas);
}

/* ------------------------------------------------------------------ */
/* Histórico de concluídas — separado da lista ativa, sobrevive a         */
/* "Limpar tudo"/exclusão individual, some sozinho depois de 30 dias.    */
/* ------------------------------------------------------------------ */

export interface NotaHistoricoItem {
  texto: string;
  concluida_em: string;
}

export const BLOCO_NOTAS_HISTORICO_DIAS = 30;
/** Teto generoso (múltiplos itens/dia por até 30 dias) — evita crescimento
    sem limite mesmo se a expiração por data não rodar por algum motivo. */
export const BLOCO_NOTAS_HISTORICO_MAX = 300;

function historicoExpirado(concluidaEm: string, agora: Date): boolean {
  const dt = new Date(concluidaEm).getTime();
  if (!Number.isFinite(dt)) return true;
  const diasPassados = (agora.getTime() - dt) / (1000 * 60 * 60 * 24);
  return diasPassados > BLOCO_NOTAS_HISTORICO_DIAS;
}

function sanitizeHistoricoItem(entry: unknown): NotaHistoricoItem | null {
  if (!entry || typeof entry !== 'object') return null;
  const item = entry as Partial<NotaHistoricoItem>;
  const texto = String(item.texto ?? '')
    .trim()
    .slice(0, NOTA_TEXTO_MAX);
  if (!texto) return null;
  if (typeof item.concluida_em !== 'string' || !item.concluida_em) return null;
  return { texto, concluida_em: item.concluida_em };
}

/** Normaliza a lista salva, expirando (>30 dias) e ordenando mais recente primeiro. */
export function sanitizeBlocoNotasHistorico(raw: unknown, agora = new Date()): NotaHistoricoItem[] {
  if (!Array.isArray(raw)) return [];
  const result: NotaHistoricoItem[] = [];
  for (const entry of raw) {
    const item = sanitizeHistoricoItem(entry);
    if (!item || historicoExpirado(item.concluida_em, agora)) continue;
    result.push(item);
    if (result.length >= BLOCO_NOTAS_HISTORICO_MAX) break;
  }
  return result.sort((a, b) => b.concluida_em.localeCompare(a.concluida_em));
}

export function resolveBlocoNotasHistorico(
  preferencias?: UserPreferencias | null,
): NotaHistoricoItem[] {
  return sanitizeBlocoNotasHistorico(preferencias?.bloco_notas_historico);
}

/** Pendentes primeiro (mais nova no topo); concluídas descem, mais recente
    primeiro dentro do próprio grupo — dá o feedback de "acabei de fazer". */
export function ordenarNotas(itens: NotaItem[]): NotaItem[] {
  const pendentes = itens
    .filter((n) => !n.feita)
    .sort((a, b) => b.criada_em.localeCompare(a.criada_em));
  const feitas = itens
    .filter((n) => n.feita)
    .sort((a, b) => (b.concluida_em ?? '').localeCompare(a.concluida_em ?? ''));
  return [...pendentes, ...feitas];
}
