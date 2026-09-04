/* Stub — sobrescrito por scripts/generate-app-version.mjs em dev/build.
   Mantido versionado para TypeScript em clone limpo antes do primeiro generate. */
import type { AppReleaseMeta } from '@shared/app-release';

export const EMBEDDED_APP_RELEASE: AppReleaseMeta = {
  version: '0.1.0',
  build: 'local-stub',
  released_at: '1970-01-01T00:00:00.000Z',
  channel: 'web',
  update_policy: 'optional',
  minimum_supported_version: null,
} as const;
