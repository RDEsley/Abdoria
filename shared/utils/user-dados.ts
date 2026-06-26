import type { NivelUsuario, StoredRepScheme, UserDadosSalvos } from '../types/index.js';
import {
  DEFAULT_USER_DADOS_SALVOS,
  mergeUserDadosSalvos,
  resolveUserDadosSalvos,
} from '../types/index.js';

type DadosLike = Partial<UserDadosSalvos> | Record<string, unknown> | null | undefined;

function normalizeEsquemasReps(raw: unknown): Partial<Record<NivelUsuario, StoredRepScheme[]>> {
  if (!raw || typeof raw !== 'object') return {};

  if (raw instanceof Map) {
    return Object.fromEntries(raw.entries()) as Partial<Record<NivelUsuario, StoredRepScheme[]>>;
  }

  return { ...(raw as Partial<Record<NivelUsuario, StoredRepScheme[]>>) };
}

export function resolveDadosSalvosForUser(dados: DadosLike): UserDadosSalvos {
  const source = (dados ?? {}) as Partial<UserDadosSalvos>;
  return resolveUserDadosSalvos({
    ...source,
    esquemas_reps: normalizeEsquemasReps(source.esquemas_reps),
  });
}

export function mergeDadosSalvos(current: DadosLike, patch: DadosLike): UserDadosSalvos {
  const base = resolveDadosSalvosForUser(current);
  const next = (patch ?? {}) as Partial<UserDadosSalvos>;
  return mergeUserDadosSalvos(base, {
    ...next,
    esquemas_reps: next.esquemas_reps ? normalizeEsquemasReps(next.esquemas_reps) : undefined,
  });
}

export function isEmptyDadosSalvos(dados: UserDadosSalvos): boolean {
  return (
    dados.treino_personalizado.length === 0
    && dados.treinos_salvos.length === 0
    && Object.keys(dados.esquemas_reps).length === 0
    && dados.exercicios_desbloqueados.length === 0
  );
}

export { DEFAULT_USER_DADOS_SALVOS };
