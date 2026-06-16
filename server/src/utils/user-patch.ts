import type { SimulacaoDefinicao, UserPreferencias } from '../types/index.js';
import { DEFAULT_PREFERENCIAS } from '../types/index.js';
import { toObjectIdString } from './sanitize-user.js';

type PreferenciasLike = Partial<UserPreferencias> | Record<string, unknown> | null | undefined;
type SimulacaoLike = Partial<SimulacaoDefinicao> | Record<string, unknown> | null | undefined;

export function mergePreferencias(
  current: PreferenciasLike,
  patch: PreferenciasLike,
): UserPreferencias {
  const merged = {
    ...DEFAULT_PREFERENCIAS,
    ...(current ?? {}),
    ...(patch ?? {}),
  } as UserPreferencias & { preset_favorito_id?: unknown };

  const fav = merged.preset_favorito_id;
  if (fav !== undefined && fav !== null) {
    merged.preset_favorito_id = toObjectIdString(fav) ?? null;
  }

  return merged;
}

export function mergeSimulacaoDefinicao(
  current: SimulacaoLike,
  patch: SimulacaoLike,
): SimulacaoDefinicao {
  const base = (current ?? {}) as Partial<SimulacaoDefinicao>;
  const p = (patch ?? {}) as Partial<SimulacaoDefinicao>;
  const meta = p.gordura_meta_pct ?? base.gordura_meta_pct ?? 12;

  return {
    ...base,
    ...p,
    gordura_meta_pct: meta,
    gordura_atual_pct: p.gordura_atual_pct ?? base.gordura_atual_pct ?? undefined,
    gordura_inicio_pct: p.gordura_inicio_pct ?? base.gordura_inicio_pct ?? undefined,
  };
}
