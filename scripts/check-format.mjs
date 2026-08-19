import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import * as prettier from 'prettier';

const SUPPORTED_EXTENSIONS = /\.(?:css|html|js|json|jsx|md|mjs|sql|ts|tsx|ya?ml)$/i;

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' })
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function changedFiles() {
  const base = process.env.GITHUB_BASE_REF;
  if (base) return git(['diff', '--name-only', '--diff-filter=ACM', `origin/${base}...HEAD`]);

  const local = [
    ...git(['diff', '--name-only', '--diff-filter=ACM', 'HEAD']),
    ...git(['ls-files', '--others', '--exclude-standard']),
  ];
  if (local.length > 0) return local;

  try {
    return git(['diff', '--name-only', '--diff-filter=ACM', 'HEAD^', 'HEAD']);
  } catch {
    return git(['ls-files']);
  }
}

const candidates = [...new Set(changedFiles())].filter((file) => SUPPORTED_EXTENSIONS.test(file));
const invalid = [];

for (const file of candidates) {
  const info = await prettier.getFileInfo(file, { ignorePath: '.prettierignore' });
  if (info.ignored || !info.inferredParser) continue;
  const source = await readFile(file, 'utf8');
  const config = (await prettier.resolveConfig(file)) ?? {};
  if (!(await prettier.check(source, { ...config, filepath: file }))) invalid.push(file);
}

if (invalid.length > 0) {
  console.error('Arquivos fora do padrão do Prettier:');
  for (const file of invalid) console.error(`- ${file}`);
  process.exit(1);
}

console.log(`Prettier aprovado em ${candidates.length} arquivo(s) alterado(s).`);
