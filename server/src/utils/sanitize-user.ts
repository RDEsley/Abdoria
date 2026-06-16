import mongoose from 'mongoose';
import { DEFAULT_PREFERENCIAS } from '../types/index.js';
import type { UserDocument } from '../models/User.js';

/** Resposta JSON segura do usuário para o client (sem senha, IDs como string). */
export function sanitizeUser(user: UserDocument | Record<string, unknown>) {
  const doc = user as UserDocument & { toObject?: () => Record<string, unknown> };
  const raw = typeof doc.toObject === 'function' ? doc.toObject() : { ...user };

  const obj = raw as Record<string, unknown>;
  delete obj.passwordHash;

  if (obj._id) {
    obj._id = String(obj._id);
  }

  obj.preferencias = {
    ...DEFAULT_PREFERENCIAS,
    ...((obj.preferencias as Record<string, unknown> | undefined) ?? {}),
  };

  if (obj.simulacao_definicao && typeof obj.simulacao_definicao === 'object') {
    const sim = obj.simulacao_definicao as Record<string, unknown>;
    if (sim.atualizado_em instanceof Date) {
      sim.atualizado_em = sim.atualizado_em.toISOString();
    }
  }

  if (obj.terms_accepted_at instanceof Date) {
    obj.terms_accepted_at = obj.terms_accepted_at.toISOString();
  }
  if (obj.muscle_map_reset_at instanceof Date) {
    obj.muscle_map_reset_at = obj.muscle_map_reset_at.toISOString();
  }
  if (obj.createdAt instanceof Date) {
    obj.createdAt = obj.createdAt.toISOString();
  }
  if (obj.updatedAt instanceof Date) {
    obj.updatedAt = obj.updatedAt.toISOString();
  }

  return obj;
}

export function toObjectIdString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  return String(value);
}
