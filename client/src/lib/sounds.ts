let enabled = true;
let volume = 0.7;
let sfxPack = 'som_classico';
let audioContext: AudioContext | null = null;

type ToneStep = {
  freq: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  gap?: number;
};

type SfxPackDef = {
  click: ToneStep;
  success: ToneStep[];
  complete: ToneStep;
  rest: ToneStep;
  unlock: ToneStep[];
};

const PACKS: Record<string, SfxPackDef> = {
  som_classico: {
    click: { freq: 880, type: 'triangle', dur: 0.06, gain: 0.05 },
    success: [
      { freq: 523, dur: 0.1, gap: 0 },
      { freq: 659, dur: 0.1, gap: 80 },
      { freq: 784, dur: 0.12, gap: 80 },
    ],
    complete: { freq: 660, type: 'triangle', dur: 0.08, gain: 0.06 },
    rest: { freq: 440, dur: 0.1, gain: 0.05 },
    unlock: [
      { freq: 523, dur: 0.09, gap: 0 },
      { freq: 659, dur: 0.09, gap: 70 },
      { freq: 784, dur: 0.09, gap: 70 },
      { freq: 1047, dur: 0.14, gap: 70 },
    ],
  },
  som_suave: {
    click: { freq: 520, type: 'sine', dur: 0.12, gain: 0.04 },
    success: [
      { freq: 392, dur: 0.16, gap: 0 },
      { freq: 494, dur: 0.18, gap: 120 },
      { freq: 587, dur: 0.2, gap: 120 },
    ],
    complete: { freq: 440, type: 'sine', dur: 0.14, gain: 0.045 },
    rest: { freq: 330, type: 'sine', dur: 0.18, gain: 0.035 },
    unlock: [
      { freq: 330, dur: 0.14, gap: 0 },
      { freq: 392, dur: 0.14, gap: 110 },
      { freq: 494, dur: 0.16, gap: 110 },
      { freq: 587, dur: 0.2, gap: 110 },
    ],
  },
  som_chime: {
    click: { freq: 1175, type: 'triangle', dur: 0.18, gain: 0.05 },
    success: [
      { freq: 784, dur: 0.22, gap: 0 },
      { freq: 988, dur: 0.24, gap: 140 },
      { freq: 1175, dur: 0.28, gap: 140 },
    ],
    complete: { freq: 988, type: 'triangle', dur: 0.2, gain: 0.055 },
    rest: { freq: 659, type: 'triangle', dur: 0.22, gain: 0.04 },
    unlock: [
      { freq: 659, dur: 0.18, gap: 0 },
      { freq: 784, dur: 0.18, gap: 130 },
      { freq: 988, dur: 0.2, gap: 130 },
      { freq: 1319, dur: 0.3, gap: 130 },
    ],
  },
  som_pop: {
    click: { freq: 1040, type: 'square', dur: 0.04, gain: 0.045 },
    success: [
      { freq: 698, type: 'square', dur: 0.06, gap: 0 },
      { freq: 880, type: 'square', dur: 0.06, gap: 55 },
      { freq: 1047, type: 'square', dur: 0.08, gap: 55 },
    ],
    complete: { freq: 880, type: 'square', dur: 0.07, gain: 0.05 },
    rest: { freq: 587, type: 'triangle', dur: 0.08, gain: 0.04 },
    unlock: [
      { freq: 587, type: 'square', dur: 0.05, gap: 0 },
      { freq: 698, type: 'square', dur: 0.05, gap: 50 },
      { freq: 880, type: 'square', dur: 0.06, gap: 50 },
      { freq: 1047, type: 'square', dur: 0.08, gap: 50 },
    ],
  },
  som_arcade: {
    click: { freq: 1200, type: 'square', dur: 0.035, gain: 0.055 },
    success: [
      { freq: 784, type: 'square', dur: 0.05, gap: 0 },
      { freq: 988, type: 'square', dur: 0.05, gap: 45 },
      { freq: 1175, type: 'square', dur: 0.06, gap: 45 },
      { freq: 1319, type: 'square', dur: 0.07, gap: 45 },
    ],
    complete: { freq: 988, type: 'square', dur: 0.06, gain: 0.06 },
    rest: { freq: 620, type: 'square', dur: 0.07, gain: 0.045 },
    unlock: [
      { freq: 880, type: 'square', dur: 0.05, gap: 0 },
      { freq: 988, type: 'square', dur: 0.05, gap: 40 },
      { freq: 1175, type: 'square', dur: 0.06, gap: 40 },
      { freq: 1319, type: 'square', dur: 0.08, gap: 40 },
    ],
  },
  som_retro: {
    click: { freq: 680, type: 'sawtooth', dur: 0.05, gain: 0.04 },
    success: [
      { freq: 494, type: 'sawtooth', dur: 0.08, gap: 0 },
      { freq: 622, type: 'sawtooth', dur: 0.08, gap: 75 },
      { freq: 740, type: 'sawtooth', dur: 0.1, gap: 75 },
    ],
    complete: { freq: 600, type: 'sawtooth', dur: 0.09, gain: 0.05 },
    rest: { freq: 370, type: 'triangle', dur: 0.1, gain: 0.04 },
    unlock: [
      { freq: 494, type: 'sawtooth', dur: 0.07, gap: 0 },
      { freq: 622, type: 'sawtooth', dur: 0.07, gap: 65 },
      { freq: 740, type: 'sawtooth', dur: 0.08, gap: 65 },
      { freq: 880, type: 'sawtooth', dur: 0.1, gap: 65 },
    ],
  },
  som_pixel: {
    click: { freq: 640, type: 'square', dur: 0.025, gain: 0.05 },
    success: [
      { freq: 440, type: 'square', dur: 0.04, gap: 0 },
      { freq: 554, type: 'square', dur: 0.04, gap: 35 },
      { freq: 659, type: 'square', dur: 0.05, gap: 35 },
    ],
    complete: { freq: 520, type: 'square', dur: 0.045, gain: 0.055 },
    rest: { freq: 330, type: 'square', dur: 0.05, gain: 0.04 },
    unlock: [
      { freq: 440, type: 'square', dur: 0.035, gap: 0 },
      { freq: 554, type: 'square', dur: 0.035, gap: 30 },
      { freq: 659, type: 'square', dur: 0.04, gap: 30 },
      { freq: 880, type: 'square', dur: 0.05, gap: 30 },
    ],
  },
  som_metal: {
    click: { freq: 196, type: 'sawtooth', dur: 0.08, gain: 0.06 },
    success: [
      { freq: 165, type: 'sawtooth', dur: 0.1, gap: 0 },
      { freq: 196, type: 'sawtooth', dur: 0.1, gap: 90 },
      { freq: 247, type: 'sawtooth', dur: 0.12, gap: 90 },
    ],
    complete: { freq: 220, type: 'sawtooth', dur: 0.12, gain: 0.065 },
    rest: { freq: 147, type: 'sawtooth', dur: 0.14, gain: 0.05 },
    unlock: [
      { freq: 165, type: 'sawtooth', dur: 0.09, gap: 0 },
      { freq: 196, type: 'sawtooth', dur: 0.09, gap: 80 },
      { freq: 247, type: 'sawtooth', dur: 0.1, gap: 80 },
      { freq: 294, type: 'sawtooth', dur: 0.14, gap: 80 },
    ],
  },
  som_epico: {
    click: { freq: 740, type: 'triangle', dur: 0.08, gain: 0.05 },
    success: [
      { freq: 523, dur: 0.12, gap: 0 },
      { freq: 659, dur: 0.12, gap: 90 },
      { freq: 784, dur: 0.14, gap: 90 },
      { freq: 988, dur: 0.18, gap: 90 },
    ],
    complete: { freq: 880, type: 'triangle', dur: 0.14, gain: 0.065 },
    rest: { freq: 440, type: 'sine', dur: 0.16, gain: 0.04 },
    unlock: [
      { freq: 523, dur: 0.1, gap: 0 },
      { freq: 659, dur: 0.1, gap: 80 },
      { freq: 784, dur: 0.12, gap: 80 },
      { freq: 988, dur: 0.16, gap: 80 },
      { freq: 1175, dur: 0.22, gap: 80 },
    ],
  },
  som_cristal: {
    click: { freq: 1568, type: 'sine', dur: 0.2, gain: 0.045 },
    success: [
      { freq: 988, dur: 0.22, gap: 0 },
      { freq: 1175, dur: 0.22, gap: 130 },
      { freq: 1318, dur: 0.24, gap: 130 },
      { freq: 1568, dur: 0.28, gap: 130 },
    ],
    complete: { freq: 1318, type: 'sine', dur: 0.24, gain: 0.05 },
    rest: { freq: 784, type: 'sine', dur: 0.26, gain: 0.035 },
    unlock: [
      { freq: 988, dur: 0.18, gap: 0 },
      { freq: 1175, dur: 0.18, gap: 110 },
      { freq: 1318, dur: 0.2, gap: 110 },
      { freq: 1568, dur: 0.24, gap: 110 },
      { freq: 1760, dur: 0.3, gap: 110 },
    ],
  },
  som_zen: {
    click: { freq: 392, type: 'sine', dur: 0.2, gain: 0.03 },
    success: [
      { freq: 262, dur: 0.28, gap: 0 },
      { freq: 294, dur: 0.3, gap: 160 },
      { freq: 330, dur: 0.32, gap: 160 },
      { freq: 392, dur: 0.36, gap: 160 },
    ],
    complete: { freq: 349, type: 'sine', dur: 0.3, gain: 0.035 },
    rest: { freq: 220, type: 'sine', dur: 0.35, gain: 0.03 },
    unlock: [
      { freq: 220, dur: 0.24, gap: 0 },
      { freq: 262, dur: 0.24, gap: 140 },
      { freq: 294, dur: 0.26, gap: 140 },
      { freq: 330, dur: 0.28, gap: 140 },
      { freq: 392, dur: 0.34, gap: 140 },
    ],
  },
  som_bolha: {
    click: { freq: 1100, type: 'sine', dur: 0.05, gain: 0.04 },
    success: [
      { freq: 740, dur: 0.06, gap: 0 },
      { freq: 880, dur: 0.06, gap: 40 },
      { freq: 988, dur: 0.06, gap: 40 },
      { freq: 1100, dur: 0.07, gap: 40 },
      { freq: 1245, dur: 0.08, gap: 40 },
    ],
    complete: { freq: 988, type: 'sine', dur: 0.07, gain: 0.045 },
    rest: { freq: 660, type: 'sine', dur: 0.08, gain: 0.035 },
    unlock: [
      { freq: 660, dur: 0.05, gap: 0 },
      { freq: 740, dur: 0.05, gap: 35 },
      { freq: 880, dur: 0.05, gap: 35 },
      { freq: 988, dur: 0.06, gap: 35 },
      { freq: 1100, dur: 0.07, gap: 35 },
    ],
  },
  som_8bit: {
    click: { freq: 523, type: 'square', dur: 0.02, gain: 0.06 },
    success: [
      { freq: 262, type: 'square', dur: 0.035, gap: 0 },
      { freq: 330, type: 'square', dur: 0.035, gap: 28 },
      { freq: 392, type: 'square', dur: 0.04, gap: 28 },
      { freq: 523, type: 'square', dur: 0.05, gap: 28 },
    ],
    complete: { freq: 440, type: 'square', dur: 0.04, gain: 0.06 },
    rest: { freq: 196, type: 'square', dur: 0.04, gain: 0.05 },
    unlock: [
      { freq: 262, type: 'square', dur: 0.03, gap: 0 },
      { freq: 330, type: 'square', dur: 0.03, gap: 25 },
      { freq: 392, type: 'square', dur: 0.035, gap: 25 },
      { freq: 523, type: 'square', dur: 0.04, gap: 25 },
      { freq: 659, type: 'square', dur: 0.05, gap: 25 },
    ],
  },
  som_treino: {
    click: { freq: 840, type: 'triangle', dur: 0.05, gain: 0.055 },
    success: [
      { freq: 440, dur: 0.08, gap: 0 },
      { freq: 554, dur: 0.08, gap: 60 },
      { freq: 659, dur: 0.09, gap: 60 },
      { freq: 740, dur: 0.1, gap: 60 },
      { freq: 880, dur: 0.12, gap: 60 },
    ],
    complete: { freq: 740, type: 'triangle', dur: 0.1, gain: 0.06 },
    rest: { freq: 494, type: 'triangle', dur: 0.12, gain: 0.045 },
    unlock: [
      { freq: 554, dur: 0.07, gap: 0 },
      { freq: 659, dur: 0.07, gap: 55 },
      { freq: 740, dur: 0.08, gap: 55 },
      { freq: 880, dur: 0.1, gap: 55 },
      { freq: 988, dur: 0.14, gap: 55 },
    ],
  },
  som_boss: {
    click: { freq: 110, type: 'sawtooth', dur: 0.14, gain: 0.07 },
    success: [
      { freq: 98, type: 'sawtooth', dur: 0.16, gap: 0 },
      { freq: 123, type: 'sawtooth', dur: 0.16, gap: 100 },
      { freq: 147, type: 'sawtooth', dur: 0.18, gap: 100 },
      { freq: 196, type: 'sawtooth', dur: 0.22, gap: 100 },
    ],
    complete: { freq: 165, type: 'sawtooth', dur: 0.2, gain: 0.07 },
    rest: { freq: 82, type: 'sawtooth', dur: 0.22, gain: 0.06 },
    unlock: [
      { freq: 82, type: 'sawtooth', dur: 0.14, gap: 0 },
      { freq: 98, type: 'sawtooth', dur: 0.14, gap: 90 },
      { freq: 123, type: 'sawtooth', dur: 0.16, gap: 90 },
      { freq: 147, type: 'sawtooth', dur: 0.18, gap: 90 },
      { freq: 196, type: 'sawtooth', dur: 0.24, gap: 90 },
    ],
  },
  som_noturno: {
    click: { freq: 311, type: 'triangle', dur: 0.16, gain: 0.035 },
    success: [
      { freq: 247, dur: 0.2, gap: 0 },
      { freq: 277, dur: 0.2, gap: 120 },
      { freq: 311, dur: 0.22, gap: 120 },
      { freq: 370, dur: 0.26, gap: 120 },
    ],
    complete: { freq: 330, type: 'triangle', dur: 0.22, gain: 0.04 },
    rest: { freq: 220, type: 'sine', dur: 0.28, gain: 0.03 },
    unlock: [
      { freq: 220, dur: 0.18, gap: 0 },
      { freq: 247, dur: 0.18, gap: 100 },
      { freq: 277, dur: 0.2, gap: 100 },
      { freq: 311, dur: 0.22, gap: 100 },
      { freq: 370, dur: 0.28, gap: 100 },
    ],
  },
  som_vitoria: {
    click: { freq: 784, type: 'triangle', dur: 0.07, gain: 0.055 },
    success: [
      { freq: 523, dur: 0.1, gap: 0 },
      { freq: 659, dur: 0.1, gap: 70 },
      { freq: 784, dur: 0.12, gap: 70 },
      { freq: 988, dur: 0.14, gap: 70 },
      { freq: 1175, dur: 0.2, gap: 70 },
    ],
    complete: { freq: 1047, type: 'triangle', dur: 0.16, gain: 0.065 },
    rest: { freq: 523, type: 'sine', dur: 0.14, gain: 0.04 },
    unlock: [
      { freq: 659, dur: 0.09, gap: 0 },
      { freq: 784, dur: 0.09, gap: 65 },
      { freq: 988, dur: 0.11, gap: 65 },
      { freq: 1175, dur: 0.14, gap: 65 },
      { freq: 1319, dur: 0.22, gap: 65 },
    ],
  },
};

export function setSoundSettings(on: boolean, vol: number) {
  enabled = on;
  volume = Math.max(0, Math.min(1, vol));
}

export function setSfxPack(pack: string) {
  sfxPack = PACKS[pack] ? pack : 'som_classico';
}

function getPack() {
  return PACKS[sfxPack] ?? PACKS.som_classico;
}

function getAudioContext(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioContext();
    }
    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }
    return audioContext;
  } catch {
    return null;
  }
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', gainPeak = 0.08) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  gain.gain.value = gainPeak * volume;
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.stop(ctx.currentTime + duration);
}

function playStep(step: ToneStep, fallbackType: OscillatorType = 'sine') {
  playTone(step.freq, step.dur ?? 0.1, step.type ?? fallbackType, step.gain ?? 0.07);
}

function playSequence(steps: ToneStep[], fallbackType: OscillatorType = 'sine') {
  steps.forEach((step, index) => {
    const delay = steps.slice(0, index).reduce((total, prev) => total + (prev.gap ?? 80), 0);
    setTimeout(() => playStep(step, fallbackType), delay);
  });
}

export function playClick() {
  playStep(getPack().click, 'triangle');
}

export function playSuccess() {
  playSequence(getPack().success, 'sine');
}

export function playLevelUp() {
  [440, 554, 659, 880].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.12, 'square', 0.06), i * 70);
  });
}

export function playStreak() {
  playTone(180, 0.05, 'sawtooth', 0.035);
  setTimeout(() => playTone(280, 0.08, 'sawtooth', 0.05), 40);
  setTimeout(() => playTone(392, 0.1, 'triangle', 0.06), 100);
  setTimeout(() => playTone(523, 0.14, 'sine', 0.065), 180);
}

export function playBeep(freq = 520, duration = 0.05) {
  playTone(freq, duration, 'sine', 0.06);
}

export function playCompleteSet() {
  playStep(getPack().complete, 'triangle');
}

export function playRestStart() {
  playStep(getPack().rest, 'sine');
}

export function playRestEnd() {
  const repeats = 3;
  const patternMs = 320;

  for (let i = 0; i < repeats; i++) {
    const offset = i * patternMs;
    setTimeout(() => playTone(660, 0.08, 'triangle', 0.07), offset);
    setTimeout(() => playTone(784, 0.12, 'sine', 0.08), offset + 90);
  }
}

export function playTimerDone() {
  playTone(880, 0.15, 'square', 0.08);
  setTimeout(() => playTone(1047, 0.2, 'sine', 0.09), 120);
}

export function playWorkoutComplete() {
  playSequence(getPack().success.map((step) => ({ ...step, dur: (step.dur ?? 0.1) + 0.04 })), 'sine');
}

export function playTabSwitch() {
  playTone(620, 0.05, 'triangle', 0.04);
}

export function playPurchase() {
  playTone(740, 0.08, 'triangle', 0.06);
  setTimeout(() => playTone(988, 0.1, 'sine', 0.07), 70);
}

export function playEquip() {
  playTone(523, 0.07, 'sine', 0.055);
  setTimeout(() => playTone(659, 0.09, 'sine', 0.06), 60);
}

export function playUnlock() {
  playSequence(getPack().unlock, 'square');
}

export function previewSfxPack(pack: string) {
  const previous = sfxPack;
  if (PACKS[pack]) sfxPack = pack;
  playClick();
  setTimeout(() => playCompleteSet(), 130);
  setTimeout(() => playUnlock(), 320);
  sfxPack = previous;
}
