#!/usr/bin/env node
/**
 * Gera sons (.wav) e ícones (.png) de notificação versionáveis.
 * Saída: client/public, android/res/raw, ios/App/App/NotificationSounds
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');

const SOUND_IDS = [
  'evolyn_leaf',
  'evolyn_sprout',
  'evolyn_xp',
  'evolyn_achievement',
  'evolyn_evolve',
  'evolyn_golden_leaf',
  'minimal_ping',
  'minimal_pop',
  'minimal_chime',
  'minimal_bell',
  'minimal_soft',
  'minimal_pulse',
  'nature_leaves',
  'nature_water',
  'nature_wind',
  'nature_drop',
  'nature_forest',
  'melody_calm',
  'melody_rise',
  'melody_spark',
  'playful_sparkle',
  'playful_bounce',
];

const ICONS = [
  { id: 'neutral', rgb: [100, 116, 139] },
  { id: 'water', rgb: [2, 132, 199] },
  { id: 'leaf', rgb: [5, 150, 105] },
  { id: 'workout', rgb: [234, 88, 12] },
  { id: 'study', rgb: [79, 70, 229] },
  { id: 'health', rgb: [16, 185, 129] },
  { id: 'alarm', rgb: [225, 29, 72] },
  { id: 'heart', rgb: [244, 63, 94] },
  { id: 'star', rgb: [217, 119, 6] },
];

const SAMPLE_RATE = 22050;

function env(t, attack, release, duration) {
  if (t < 0) return 0;
  if (t < attack) return t / attack;
  if (t > duration - release) return Math.max(0, (duration - t) / release);
  return 1;
}

function tone(freq, t, type = 'sine') {
  const phase = 2 * Math.PI * freq * t;
  if (type === 'sine') return Math.sin(phase);
  if (type === 'triangle') return (2 / Math.PI) * Math.asin(Math.sin(phase));
  return Math.sin(phase);
}

function noise(t, seed) {
  const x = Math.sin(t * 12_989.3 + seed * 78_233.1) * 43_758.5453;
  return x - Math.floor(x);
}

function mix(samples) {
  return samples.reduce((sum, value) => sum + value, 0) / samples.length;
}

const soundRecipes = {
  evolyn_leaf: (t) => {
    const e = env(t, 0.02, 0.35, 0.9);
    return e * mix([tone(523, t), tone(659, t) * 0.45, tone(784, t) * 0.25]);
  },
  evolyn_sprout: (t) => {
    const e = env(t, 0.04, 0.4, 1.1);
    const sweep = 420 + t * 280;
    return e * tone(sweep, t, 'sine') * 0.9;
  },
  evolyn_xp: (t) => {
    const e = env(t, 0.005, 0.12, 0.7);
    return e * mix([tone(880, t), tone(1175, t) * 0.6, tone(1568, t) * 0.35]);
  },
  evolyn_achievement: (t) => {
    const e = env(t, 0.01, 0.5, 1.4);
    const notes = [523, 659, 784, 1047];
    let sum = 0;
    for (let index = 0; index < notes.length; index += 1) {
      const start = index * 0.18;
      if (t >= start) sum += env(t - start, 0.01, 0.25, 0.5) * tone(notes[index], t - start);
    }
    return e * sum * 0.35;
  },
  evolyn_evolve: (t) => {
    const e = env(t, 0.03, 0.55, 1.5);
    const arp = [392, 494, 587, 740, 880];
    const step = Math.floor(t / 0.22) % arp.length;
    return e * tone(arp[step], t) * 0.75;
  },
  evolyn_golden_leaf: (t) => {
    const e = env(t, 0.02, 0.45, 1.2);
    return e * mix([tone(622, t), tone(932, t) * 0.5, tone(1245, t) * 0.3, tone(1860, t) * 0.15]);
  },
  minimal_ping: (t) => env(t, 0.001, 0.08, 0.35) * tone(1046, t),
  minimal_pop: (t) => env(t, 0.001, 0.06, 0.28) * tone(660, t, 'triangle'),
  minimal_chime: (t) => {
    const e = env(t, 0.005, 0.5, 0.8);
    return e * mix([tone(740, t), tone(988, t) * 0.55]);
  },
  minimal_bell: (t) => {
    const e = env(t, 0.003, 0.7, 1.0);
    return e * mix([tone(587, t), tone(880, t) * 0.4, tone(1175, t) * 0.2]);
  },
  minimal_soft: (t) => env(t, 0.04, 0.35, 0.6) * tone(440, t) * 0.8,
  minimal_pulse: (t) => {
    const pulse = (Math.sin(t * 16) + 1) * 0.5;
    return env(t, 0.01, 0.15, 0.5) * tone(330, t) * (0.4 + pulse * 0.6);
  },
  nature_leaves: (t) => {
    const e = env(t, 0.05, 0.45, 1.1);
    return e * (noise(t, 1) * 0.35 + tone(220 + noise(t, 2) * 80, t) * 0.2);
  },
  nature_water: (t) => {
    const e = env(t, 0.08, 0.5, 0.9);
    return e * (noise(t, 3) * 0.25 + tone(180, t) * 0.15);
  },
  nature_wind: (t) => {
    const e = env(t, 0.1, 0.55, 1.0);
    return e * noise(t, 4) * 0.4;
  },
  nature_drop: (t) => {
    const e = env(t, 0.002, 0.2, 0.65);
    return e * mix([tone(520, t), tone(780, t) * 0.35]);
  },
  nature_forest: (t) => {
    const e = env(t, 0.06, 0.6, 1.6);
    const chirp = Math.sin(t * 42) * tone(1800 + Math.sin(t * 7) * 400, t);
    return e * (noise(t, 5) * 0.18 + chirp * 0.08);
  },
  melody_calm: (t) => {
    const notes = [392, 440, 494, 523];
    const step = Math.floor(t / 0.35) % notes.length;
    const local = t - Math.floor(t / 0.35) * 0.35;
    return env(local, 0.02, 0.2, 0.35) * tone(notes[step], local) * 0.7;
  },
  melody_rise: (t) => {
    const notes = [330, 392, 440, 523, 587, 659];
    const step = Math.min(notes.length - 1, Math.floor(t / 0.22));
    const local = t - step * 0.22;
    return env(local, 0.01, 0.18, 0.28) * tone(notes[step], local) * 0.75;
  },
  melody_spark: (t) => {
    const notes = [659, 784, 988, 1175];
    const step = Math.floor(t / 0.2) % notes.length;
    const local = t - Math.floor(t / 0.2) * 0.2;
    return env(local, 0.005, 0.15, 0.25) * tone(notes[step], local) * 0.65;
  },
  playful_sparkle: (t) => {
    const e = env(t, 0.005, 0.2, 0.8);
    return e * mix([tone(1046, t), tone(1318, t) * 0.5, tone(1568, t) * 0.35]);
  },
  playful_bounce: (t) => {
    const bounce = Math.abs(Math.sin(t * 10));
    return env(t, 0.005, 0.12, 0.7) * tone(350 + bounce * 250, t, 'triangle') * 0.8;
  },
};

function renderSound(id, durationSec) {
  const recipe = soundRecipes[id];
  const total = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Float32Array(total);
  for (let index = 0; index < total; index += 1) {
    const t = index / SAMPLE_RATE;
    samples[index] = Math.max(-1, Math.min(1, recipe(t) * 0.85));
  }
  return samples;
}

function writeWav(path, samples) {
  mkdirSync(dirname(path), { recursive: true });
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
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
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.max(-1, Math.min(1, samples[index]));
    buffer.writeInt16LE(Math.round(value * 32767), 44 + index * 2);
  }
  writeFileSync(path, buffer);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuffer = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function writeIconPng(path, size, rgb) {
  mkdirSync(dirname(path), { recursive: true });
  const rowSize = 1 + size * 4;
  const raw = Buffer.alloc(rowSize * size);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const radius = size * 0.38;
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * rowSize;
    raw[rowStart] = 0;
    for (let x = 0; x < size; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const alpha =
        dist <= radius ? 255 : dist < radius + 1.5 ? Math.round(255 * (radius + 1.5 - dist)) : 0;
      const highlight = Math.max(0, 1 - dist / radius) * 0.25;
      const offset = rowStart + 1 + x * 4;
      raw[offset] = Math.min(255, Math.round(rgb[0] + highlight * 60));
      raw[offset + 1] = Math.min(255, Math.round(rgb[1] + highlight * 60));
      raw[offset + 2] = Math.min(255, Math.round(rgb[2] + highlight * 40));
      raw[offset + 3] = alpha;
    }
  }
  const compressed = deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
}

function writeMonoSmallIcon(path, size) {
  mkdirSync(dirname(path), { recursive: true });
  const rowSize = 1 + size * 4;
  const raw = Buffer.alloc(rowSize * size);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * rowSize;
    raw[rowStart] = 0;
    for (let x = 0; x < size; x += 1) {
      const dx = (x - cx) / (size * 0.42);
      const dy = (y - cy) / (size * 0.42);
      const inLeaf = dx * dx + (dy + 0.15) * (dy + 0.15) < 1 && dy > -0.55;
      const alpha = inLeaf ? 255 : 0;
      const offset = rowStart + 1 + x * 4;
      raw[offset] = 255;
      raw[offset + 1] = 255;
      raw[offset + 2] = 255;
      raw[offset + 3] = alpha;
    }
  }
  const compressed = deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
}

const durations = {
  evolyn_leaf: 0.9,
  evolyn_sprout: 1.1,
  evolyn_xp: 0.7,
  evolyn_achievement: 1.4,
  evolyn_evolve: 1.5,
  evolyn_golden_leaf: 1.2,
  minimal_ping: 0.35,
  minimal_pop: 0.28,
  minimal_chime: 0.8,
  minimal_bell: 1.0,
  minimal_soft: 0.6,
  minimal_pulse: 0.5,
  nature_leaves: 1.1,
  nature_water: 0.9,
  nature_wind: 1.0,
  nature_drop: 0.65,
  nature_forest: 1.6,
  melody_calm: 1.8,
  melody_rise: 1.7,
  melody_spark: 1.5,
  playful_sparkle: 0.8,
  playful_bounce: 0.7,
};

const publicSounds = join(root, 'client/public/media/notifications/sounds');
const publicIcons = join(root, 'client/public/media/notifications/icons');
const androidRaw = join(root, 'android/app/src/main/res/raw');
const iosSounds = join(root, 'ios/App/App/NotificationSounds');

mkdirSync(publicSounds, { recursive: true });
mkdirSync(publicIcons, { recursive: true });
mkdirSync(androidRaw, { recursive: true });
mkdirSync(iosSounds, { recursive: true });

for (const id of SOUND_IDS) {
  const samples = renderSound(id, durations[id]);
  const wavPath = join(publicSounds, `${id}.wav`);
  writeWav(wavPath, samples);
  copyFileSync(wavPath, join(androidRaw, `${id}.wav`));
  copyFileSync(wavPath, join(iosSounds, `${id}.wav`));
}

for (const icon of ICONS) {
  for (const size of [96, 192]) {
    writeIconPng(join(publicIcons, `${icon.id}-${size}.png`), size, icon.rgb);
  }
}

writeMonoSmallIcon(join(root, 'android/app/src/main/res/drawable/ic_stat_evolyn.png'), 96);
writeMonoSmallIcon(join(root, 'client/public/media/notifications/icons/evolyn-mono-96.png'), 96);

const manifest = {
  generatedAt: new Date().toISOString(),
  sounds: SOUND_IDS,
  icons: ICONS.map((icon) => icon.id),
  checksum: createHash('sha256').update(SOUND_IDS.join(',')).digest('hex').slice(0, 12),
};

writeFileSync(join(publicSounds, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Generated ${SOUND_IDS.length} sounds and ${ICONS.length} icon sets.`);

if (!existsSync(join(root, 'ios/App/App.xcodeproj/project.pbxproj'))) {
  console.warn(
    'iOS Xcode project not found — verify NotificationSounds are in Copy Bundle Resources.',
  );
}
