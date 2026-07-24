import type { UserRecord } from '../types/user-record.js';
import { DEFAULT_PREFERENCIAS, resolveCosmeticos, xpLevelFromTotal } from '../types/index.js';
import type { PublicProfile } from '../types/index.js';
import { resolveDadosSalvosForUser } from './user-dados.js';

/** Resposta JSON segura do usuário para o client (sem senha). */
export function sanitizeUser(user: UserRecord | Record<string, unknown>) {
  const raw = { ...user } as Record<string, unknown>;
  delete raw.passwordHash;

  if (raw._id && !raw.id) {
    raw.id = String(raw._id);
    delete raw._id;
  }

  if (raw.id) {
    raw.id = String(raw.id);
  }

  raw.preferencias = {
    ...DEFAULT_PREFERENCIAS,
    ...((raw.preferencias as Record<string, unknown> | undefined) ?? {}),
  };

  raw.cosmeticos = resolveCosmeticos(
    raw.cosmeticos as Parameters<typeof resolveCosmeticos>[0],
    Number((raw.gamificacao as { nivel_xp?: number } | undefined)?.nivel_xp ?? 0),
  );

  raw.dados_salvos = resolveDadosSalvosForUser(
    raw.dados_salvos as Parameters<typeof resolveDadosSalvosForUser>[0],
  );

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

type PublicProfileExtras = Pick<
  PublicProfile,
  'records_top' | 'conquistas' | 'social' | 'likes' | 'relacao'
>;

/** Perfil público de outro usuário (ranking, amigos) — whitelist positiva, nunca
    email/idade/peso/preferências/dados_salvos/inventário/afk/perfil ou plano de treino. */
export function sanitizePublicProfile(
  user: UserRecord,
  podio: { first: number; second: number; third: number },
  extras: PublicProfileExtras,
): PublicProfile {
  const cosmeticos = resolveCosmeticos(user.cosmeticos, user.gamificacao.nivel_xp);
  return {
    user_id: user.id,
    nome: user.nome,
    avatar_url: user.avatar_url ?? null,
    descricao: user.descricao ?? null,
    level: xpLevelFromTotal(user.gamificacao.nivel_xp),
    streak_atual: user.gamificacao.streak_atual,
    moldura_loja_equipada: cosmeticos.moldura_loja_equipada,
    moldura_equipada: cosmeticos.moldura_equipada ?? null,
    borda_perfil_fonte: cosmeticos.borda_perfil_fonte,
    titulo_equipado: cosmeticos.titulo_equipado,
    banner_equipado: cosmeticos.banner_equipado,
    podio,
    tempo_jogo_minutos: user.gamificacao.total_minutos,
    ...extras,
  };
}

export function toIdString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return String(value);
}
