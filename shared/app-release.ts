/**
 * Metadados de release do Evolyn.
 *
 * Build != Release:
 * - `version` (release) muda só quando a versão é disponibilizada aos usuários.
 * - `build` muda a cada deploy e serve para diagnóstico/cache.
 */

export interface AppReleaseMeta {
  /** Versão semântica da release (fonte: package.json root). */
  version: string;
  /** Identidade da build (commit SHA ou fallback local). */
  build: string;
  /** ISO timestamp do build. */
  released_at: string;
  /** Canal atual — preparado para store no futuro. */
  channel: 'web' | 'android' | 'ios';
  /**
   * Política atual de update. Hoje sempre `optional`.
   * `mandatory` fica reservado para releases incompatíveis no futuro.
   */
  update_policy: 'optional' | 'mandatory';
  /** Futuro: versão mínima aceita pelo backend. Null = sem piso. */
  minimum_supported_version: string | null;
}

export type AppUpdateStrategy = 'web_reload' | 'store' | 'manual';

export function shortBuildId(build: string): string {
  if (!build) return 'dev';
  return build.startsWith('local-') ? build.slice(0, 12) : build.slice(0, 7);
}

/** Compara semver simples (major.minor.patch). Retorna >0 se a > b. */
export function compareSemver(a: string, b: string): number {
  const parse = (value: string) =>
    value
      .replace(/^v/i, '')
      .split('.')
      .slice(0, 3)
      .map((part) => {
        const n = Number.parseInt(part.replace(/[^0-9].*$/, ''), 10);
        return Number.isFinite(n) ? n : 0;
      });
  const left = parse(a);
  const right = parse(b);
  for (let index = 0; index < 3; index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta !== 0) return delta > 0 ? 1 : -1;
  }
  return 0;
}

/**
 * Atualização visível ao usuário: somente se a release remota for mais nova.
 * Diferença só de `build` NÃO gera update notice.
 */
export function hasVisibleReleaseUpdate(
  current: Pick<AppReleaseMeta, 'version'>,
  latest: Pick<AppReleaseMeta, 'version'>,
): boolean {
  return compareSemver(latest.version, current.version) > 0;
}

/** Futuro: versão abaixo do mínimo suportado. */
export function isBelowMinimumSupported(
  currentVersion: string,
  minimumSupported: string | null | undefined,
): boolean {
  if (!minimumSupported) return false;
  return compareSemver(currentVersion, minimumSupported) < 0;
}

export function resolveUpdateStrategy(channel: AppReleaseMeta['channel']): AppUpdateStrategy {
  if (channel === 'android' || channel === 'ios') return 'store';
  return 'web_reload';
}
