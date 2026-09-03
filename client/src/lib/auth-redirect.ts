export const AUTH_PATHS = ['/welcome', '/login', '/register'] as const;

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((path) => pathname === path);
}

export interface LocationLike {
  pathname: string;
  search?: string;
  hash?: string;
}

/**
 * Destino após login/cadastro. Onboarding tem prioridade no primeiro acesso;
 * senão, devolve o deep link original (perfil, convite, rota protegida).
 */
export function resolvePostAuthPath(
  from: LocationLike | undefined,
  onboardingCompleted: boolean,
): string {
  if (!onboardingCompleted) return '/onboarding';
  if (from?.pathname && !isAuthPath(from.pathname) && from.pathname !== '/') {
    return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`;
  }
  return '/';
}

export function readAuthFromState(state: unknown): LocationLike | undefined {
  if (!state || typeof state !== 'object') return undefined;
  const from = (state as { from?: LocationLike }).from;
  if (!from?.pathname) return undefined;
  return from;
}
