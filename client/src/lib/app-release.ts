import type { AppReleaseMeta } from '@shared/app-release';
import { EMBEDDED_APP_RELEASE } from '@/generated/app-release';

/** Identidade da build embutida no bundle no momento do build. */
export function getRunningRelease(): AppReleaseMeta {
  return { ...EMBEDDED_APP_RELEASE };
}

/** Consulta o metadata publicado (sempre a versão remota mais recente). */
export async function fetchLatestRelease(signal?: AbortSignal): Promise<AppReleaseMeta> {
  const response = await fetch('/version.json', {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) {
    throw new Error(`version.json ${response.status}`);
  }
  const raw = (await response.json()) as Partial<AppReleaseMeta>;
  if (!raw.version || !raw.build) {
    throw new Error('version.json inválido');
  }
  return {
    version: String(raw.version),
    build: String(raw.build),
    released_at: String(raw.released_at || new Date().toISOString()),
    channel: raw.channel === 'android' || raw.channel === 'ios' ? raw.channel : 'web',
    update_policy: raw.update_policy === 'mandatory' ? 'mandatory' : 'optional',
    minimum_supported_version: raw.minimum_supported_version ?? null,
  };
}
