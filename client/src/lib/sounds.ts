let enabled = true;
let volume = 0.7;
let sfxPack = 'som_classico';
let audioContext: AudioContext | null = null;

const PACKS: Record<string, { click: number; success: number[]; complete: number; rest: number; unlock: number[] }> = {
  som_classico: { click: 880, success: [523, 659, 784], complete: 660, rest: 440, unlock: [523, 659, 784, 1047] },
  som_suave: { click: 720, success: [392, 494, 587], complete: 520, rest: 392, unlock: [392, 494, 587, 698] },
  som_chime: { click: 988, success: [659, 784, 988], complete: 784, rest: 523, unlock: [523, 659, 784, 988] },
  som_pop: { click: 1040, success: [698, 880, 1047], complete: 880, rest: 587, unlock: [587, 698, 880, 1047] },
  som_arcade: { click: 1200, success: [784, 988, 1175], complete: 880, rest: 620, unlock: [880, 988, 1175, 1319] },
  som_retro: { click: 680, success: [494, 622, 740], complete: 600, rest: 370, unlock: [494, 622, 740, 880] },
  som_pixel: { click: 640, success: [440, 554, 659], complete: 520, rest: 330, unlock: [440, 554, 659, 880] },
  som_metal: { click: 920, success: [330, 415, 494], complete: 440, rest: 280, unlock: [330, 415, 494, 587] },
  som_epico: { click: 980, success: [622, 740, 880], complete: 740, rest: 494, unlock: [622, 740, 880, 988] },
  som_cristal: { click: 1318, success: [988, 1175, 1318, 1568], complete: 1175, rest: 784, unlock: [988, 1175, 1318, 1568, 1760] },
  som_zen: { click: 440, success: [294, 349, 392, 440], complete: 392, rest: 262, unlock: [262, 294, 349, 392, 440] },
  som_bolha: { click: 1100, success: [740, 880, 988, 1100], complete: 988, rest: 660, unlock: [660, 740, 880, 988, 1100] },
  som_8bit: { click: 523, success: [262, 330, 392, 523], complete: 440, rest: 196, unlock: [262, 330, 392, 523, 659] },
  som_treino: { click: 840, success: [440, 554, 659, 740, 880], complete: 740, rest: 494, unlock: [554, 659, 740, 880, 988] },
  som_boss: { click: 220, success: [165, 196, 220, 262, 330], complete: 247, rest: 165, unlock: [165, 196, 220, 262, 330] },
  som_noturno: { click: 370, success: [277, 311, 370, 415, 494], complete: 349, rest: 247, unlock: [277, 311, 370, 415, 494] },
  som_vitoria: { click: 784, success: [523, 659, 784, 988, 1175], complete: 880, rest: 523, unlock: [659, 784, 988, 1175, 1319] },
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

export function playClick() {
  playTone(getPack().click, 0.06, 'triangle', 0.05);
}

export function playSuccess() {
  getPack().success.forEach((freq, index) => {
    setTimeout(() => playTone(freq, 0.1, 'sine', 0.07), index * 80);
  });
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
  playTone(getPack().complete, 0.08, 'triangle', 0.06);
}

export function playRestStart() {
  playTone(getPack().rest, 0.1, 'sine', 0.05);
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
  getPack().success.forEach((freq, index) => {
    setTimeout(() => playTone(freq, 0.14, 'sine', 0.08), index * 100);
  });
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
  getPack().unlock.forEach((freq, index) => {
    setTimeout(() => playTone(freq, 0.1, 'square', 0.055), index * 80);
  });
}

export function previewSfxPack(pack: string) {
  const previous = sfxPack;
  if (PACKS[pack]) sfxPack = pack;
  playUnlock();
  sfxPack = previous;
}
