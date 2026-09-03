/**
 * Gera WAVs determinísticos a partir dos shopPreview do catálogo de SFX.
 * Não usa samples de terceiros — a identidade sonora é a mesma do Web Audio.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CATALOG = path.join(ROOT, 'client/src/lib/sounds/catalog.ts');
const SAMPLE_RATE = 22050;

function parseShopPreviews(source) {
  const packs = {};
  const packRe = /^  (som_[a-z0-9]+): \{/gm;
  let match;
  while ((match = packRe.exec(source))) {
    const id = match[1];
    const from = source.indexOf('shopPreview:', match.index);
    const nextPack = source.indexOf('\n  som_', match.index + 1);
    if (from < 0 || (nextPack > 0 && from > nextPack)) continue;
    const blockStart = source.indexOf('[', from);
    const blockEnd = source.indexOf('],', blockStart);
    if (blockStart < 0 || blockEnd < 0) continue;
    const body = source.slice(blockStart, blockEnd + 1);
    const steps = [];
    const stepRe =
      /\{\s*freq:\s*(\d+)[^}]*?(?:type:\s*'(\w+)')?[^}]*?(?:dur:\s*([\d.]+))?[^}]*?(?:gap:\s*(\d+))?[^}]*?(?:harmonic:\s*([\d.]+))?/g;
    let step;
    while ((step = stepRe.exec(body))) {
      steps.push({
        freq: Number(step[1]),
        type: step[2] || 'sine',
        dur: step[3] ? Number(step[3]) : 0.12,
        gap: step[4] ? Number(step[4]) : 80,
        harmonic: step[5] ? Number(step[5]) : 0,
      });
    }
    if (steps.length) packs[id] = steps;
  }
  return packs;
}

function sampleWave(type, phase) {
  const sine = Math.sin(phase);
  if (type === 'triangle') return (2 / Math.PI) * Math.asin(sine);
  if (type === 'square') return sine >= 0 ? 1 : -1;
  if (type === 'sawtooth') return 2 * ((phase / (2 * Math.PI)) % 1) - 1;
  return sine;
}

function render(steps) {
  const samples = [];
  for (const step of steps) {
    const n = Math.max(1, Math.floor(SAMPLE_RATE * step.dur));
    for (let i = 0; i < n; i += 1) {
      const t = i / SAMPLE_RATE;
      const env = Math.min(1, i / (0.01 * SAMPLE_RATE)) * Math.min(1, (n - i) / (0.035 * SAMPLE_RATE));
      const phase = 2 * Math.PI * step.freq * t;
      let value = sampleWave(step.type, phase);
      if (step.harmonic) value = value * 0.72 + sampleWave(step.type, phase * step.harmonic) * 0.28;
      samples.push(value * 0.28 * env);
    }
    const gap = Math.floor(SAMPLE_RATE * (step.gap / 1000));
    for (let i = 0; i < gap; i += 1) samples.push(0);
  }
  return samples;
}

function encodeWav(samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i += 1) {
    const clipped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clipped * 32767), 44 + i * 2);
  }
  return buffer;
}

function writeAll(fileName, samples) {
  const wav = encodeWav(samples);
  const targets = [
    path.join(ROOT, 'client/public/media/notifications/sounds', fileName),
    path.join(ROOT, 'android/app/src/main/res/raw', fileName),
    path.join(ROOT, 'ios/App/App/NotificationSounds', fileName),
  ];
  for (const target of targets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, wav);
  }
}

const source = fs.readFileSync(CATALOG, 'utf8');
const packs = parseShopPreviews(source);
if (Object.keys(packs).length < 8) {
  throw new Error('Não foi possível ler shopPreview do catálogo de sons.');
}

writeAll('evolyn_silent.wav', Array.from({ length: Math.floor(SAMPLE_RATE * 0.12) }, () => 0));

for (const [id, steps] of Object.entries(packs)) {
  writeAll(`evolyn_${id.replace(/^som_/, '')}.wav`, render(steps));
}

const iosDir = path.join(ROOT, 'ios/App/App/NotificationSounds');
const readme = `# Sons de notificação iOS

Estes WAV são gerados por \`scripts/generate-reminder-sounds.mjs\` a partir
do catálogo Evolyn. Arraste a pasta para o target App se o Xcode não
copiá-los automaticamente para o bundle.
`;
fs.writeFileSync(path.join(iosDir, 'README.md'), readme);

console.log(`Gerados ${Object.keys(packs).length + 1} sons nativos de lembrete.`);
