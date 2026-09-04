#!/usr/bin/env node
/**
 * Garante client/src/generated/app-release.ts para TypeScript em clone limpo.
 * O arquivo real é gerado por generate-app-version.mjs (dev/build) e fica no .gitignore.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const generatedDir = join(root, 'client/src/generated');
const target = join(generatedDir, 'app-release.ts');
const stub = join(generatedDir, 'app-release.stub.ts');

if (existsSync(target)) process.exit(0);
if (!existsSync(stub)) {
  console.error('ensure-app-release: stub ausente em', stub);
  process.exit(1);
}
mkdirSync(generatedDir, { recursive: true });
copyFileSync(stub, target);
console.log('ensure-app-release: stub → app-release.ts');
