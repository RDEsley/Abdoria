import type { UserDocument } from '../types/user-document.js';
import { DEFAULT_PREFERENCIAS, resolveCosmeticos } from '../types/index.js';
import { resolveDadosSalvosForUser } from './user-dados.js';

/** Resposta JSON segura do usuário para o client (sem senha). */
export function sanitizeUser(user: UserDocument | Record<string, unknown>) {
  const raw = { ...user } as Record<string, unknown>;
  delete raw.passwordHash;

  if (raw._id) {
    raw._id = String(raw._id);
  }

  raw.preferencias = {
    ...DEFAULT_PREFERENCIAS,
    ...((raw.preferencias as Record<string, unknown> | undefined) ?? {}),
  };

  raw.cosmeticos = resolveCosmeticos(
    raw.cosmeticos as Parameters<typeof resolveCosmeticos>[0],
    Number((raw.gamificacao as { nivel_xp?: number } | undefined)?.nivel_xp ?? 0),
  );

  raw.dados_salvos = resolveDadosSalvosForUser(raw.dados_salvos as Parameters<typeof resolveDadosSalvosForUser>[0]);

  if (raw.simulacao_definicao && typeof raw.simulacao_definicao === 'object') {
    const sim = raw.simulacao_definicao as Record<string, unknown>;
    if (sim.atualizado_em instanceof Date) {
      sim.atualizado_em = sim.atualizado_em.toISOString();
    }
  }

  if (raw.terms_accepted_at instanceof Date) {
    raw.terms_accepted_at = raw.terms_accepted_at.toISOString();
  }
  if (raw.muscle_map_reset_at instanceof Date) {
    raw.muscle_map_reset_at = raw.muscle_map_reset_at.toISOString();
  }
  if (raw.createdAt instanceof Date) {
    raw.createdAt = raw.createdAt.toISOString();
  }
  if (raw.updatedAt instanceof Date) {
    raw.updatedAt = raw.updatedAt.toISOString();
  }

  return raw;
}

export function toObjectIdString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return String(value);
}
