import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function resolveBuildId() {
  const fromEnv =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.COMMIT_REF;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();

  try {
    return execSync('git rev-parse HEAD', {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();
  } catch {
    return `local-${Date.now().toString(36)}`;
  }
}

const meta = {
  version: String(pkg.version || '0.1.0'),
  build: resolveBuildId(),
  released_at: new Date().toISOString(),
  channel: 'web',
  update_policy: 'optional',
  minimum_supported_version: null,
};

const publicPath = join(root, 'client/public/version.json');
const generatedDir = join(root, 'client/src/generated');
const generatedTsPath = join(generatedDir, 'app-release.ts');

mkdirSync(dirname(publicPath), { recursive: true });
mkdirSync(generatedDir, { recursive: true });

writeFileSync(publicPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
writeFileSync(
  generatedTsPath,
  `/* Gerado por scripts/generate-app-version.mjs — não editar à mão. */\n` +
    `import type { AppReleaseMeta } from '@shared/app-release';\n\n` +
    `export const EMBEDDED_APP_RELEASE: AppReleaseMeta = ${JSON.stringify(meta, null, 2)} as const;\n`,
  'utf8',
);

console.log(
  `app-release: version=${meta.version} build=${meta.build.slice(0, 7)} → public/version.json`,
);
