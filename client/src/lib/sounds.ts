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
  /** Segundo oscilador em múltiplo da frequência base (ex.: 2 = oitava) */
  harmonic?: number;
};

type SfxPackDef = {
  click: ToneStep;
  success: ToneStep[];
  complete: ToneStep;
  rest: ToneStep;
  unlock: ToneStep[];
  levelUp: ToneStep[];
  streak: ToneStep[];
  tabSwitch: ToneStep;
  purchase: ToneStep[];
  equip: ToneStep[];
  timerDone: ToneStep[];
  restEnd: ToneStep[];
};

const PACKS: Record<string, SfxPackDef> = {
  /* Piano clássico — acordes ascendentes suaves */
  som_classico: {
    click: { freq: 880, type: 'triangle', dur: 0.07, gain: 0.05, harmonic: 2 },
    success: [
      { freq: 523, dur: 0.11, gap: 0, harmonic: 2 },
      { freq: 659, dur: 0.11, gap: 85 },
      { freq: 784, dur: 0.14, gap: 85, harmonic: 2 },
    ],
    complete: { freq: 660, type: 'triangle', dur: 0.1, gain: 0.06, harmonic: 2 },
    rest: { freq: 440, dur: 0.14, gain: 0.045 },
    unlock: [
      { freq: 523, dur: 0.1, gap: 0 },
      { freq: 659, dur: 0.1, gap: 75 },
      { freq: 784, dur: 0.1, gap: 75 },
      { freq: 1047, dur: 0.16, gap: 75, harmonic: 2 },
    ],
    levelUp: [
      { freq: 440, dur: 0.1, gap: 0 },
      { freq: 554, dur: 0.1, gap: 70 },
      { freq: 659, dur: 0.12, gap: 70 },
      { freq: 880, dur: 0.18, gap: 70, harmonic: 2 },
    ],
    streak: [
      { freq: 392, dur: 0.08, gap: 0 },
      { freq: 494, dur: 0.1, gap: 60 },
      { freq: 587, dur: 0.14, gap: 60, harmonic: 2 },
    ],
    tabSwitch: { freq: 620, type: 'triangle', dur: 0.06, gain: 0.04 },
    purchase: [
      { freq: 659, dur: 0.09, gap: 0 },
      { freq: 784, dur: 0.12, gap: 65, harmonic: 2 },
    ],
    equip: [
      { freq: 523, dur: 0.08, gap: 0 },
      { freq: 659, dur: 0.11, gap: 55 },
    ],
    timerDone: [
      { freq: 784, dur: 0.12, gap: 0 },
      { freq: 988, dur: 0.18, gap: 100 },
    ],
    restEnd: [
      { freq: 523, dur: 0.1, gap: 0 },
      { freq: 659, dur: 0.14, gap: 90 },
    ],
  },
  /* Flauta — notas longas e respiradas */
  som_suave: {
    click: { freq: 520, type: 'sine', dur: 0.16, gain: 0.035 },
    success: [
      { freq: 392, dur: 0.22, gap: 0 },
      { freq: 494, dur: 0.24, gap: 140 },
      { freq: 587, dur: 0.28, gap: 140 },
    ],
    complete: { freq: 440, type: 'sine', dur: 0.2, gain: 0.04 },
    rest: { freq: 330, type: 'sine', dur: 0.28, gain: 0.03 },
    unlock: [
      { freq: 330, dur: 0.2, gap: 0 },
      { freq: 392, dur: 0.2, gap: 120 },
      { freq: 494, dur: 0.22, gap: 120 },
      { freq: 587, dur: 0.28, gap: 120 },
    ],
    levelUp: [
      { freq: 330, dur: 0.2, gap: 0 },
      { freq: 392, dur: 0.22, gap: 130 },
      { freq: 494, dur: 0.24, gap: 130 },
      { freq: 587, dur: 0.3, gap: 130 },
    ],
    streak: [
      { freq: 294, dur: 0.18, gap: 0 },
      { freq: 349, dur: 0.22, gap: 100 },
      { freq: 440, dur: 0.28, gap: 100 },
    ],
    tabSwitch: { freq: 392, type: 'sine', dur: 0.12, gain: 0.03 },
    purchase: [
      { freq: 440, dur: 0.16, gap: 0 },
      { freq: 523, dur: 0.22, gap: 110 },
    ],
    equip: [
      { freq: 349, dur: 0.14, gap: 0 },
      { freq: 440, dur: 0.18, gap: 90 },
    ],
    timerDone: [
      { freq: 494, dur: 0.2, gap: 0 },
      { freq: 587, dur: 0.28, gap: 130 },
    ],
    restEnd: [
      { freq: 392, dur: 0.18, gap: 0 },
      { freq: 494, dur: 0.24, gap: 110 },
    ],
  },
  /* Sinos / carrilhão */
  som_chime: {
    click: { freq: 1175, type: 'triangle', dur: 0.28, gain: 0.045, harmonic: 2.01 },
    success: [
      { freq: 784, dur: 0.3, gap: 0, harmonic: 2 },
      { freq: 988, dur: 0.32, gap: 160 },
      { freq: 1175, dur: 0.38, gap: 160, harmonic: 2 },
    ],
    complete: { freq: 988, type: 'triangle', dur: 0.26, gain: 0.05, harmonic: 2 },
    rest: { freq: 659, type: 'triangle', dur: 0.3, gain: 0.035, harmonic: 2 },
    unlock: [
      { freq: 659, dur: 0.22, gap: 0, harmonic: 2 },
      { freq: 784, dur: 0.22, gap: 140 },
      { freq: 988, dur: 0.26, gap: 140 },
      { freq: 1319, dur: 0.38, gap: 140, harmonic: 2 },
    ],
    levelUp: [
      { freq: 659, dur: 0.2, gap: 0, harmonic: 2 },
      { freq: 784, dur: 0.22, gap: 120 },
      { freq: 988, dur: 0.26, gap: 120 },
      { freq: 1175, dur: 0.34, gap: 120, harmonic: 2 },
    ],
    streak: [
      { freq: 784, dur: 0.24, gap: 0, harmonic: 2 },
      { freq: 988, dur: 0.3, gap: 100 },
    ],
    tabSwitch: { freq: 988, type: 'triangle', dur: 0.14, gain: 0.035, harmonic: 2 },
    purchase: [
      { freq: 880, dur: 0.2, gap: 0, harmonic: 2 },
      { freq: 1175, dur: 0.28, gap: 120 },
    ],
    equip: [
      { freq: 784, dur: 0.18, gap: 0 },
      { freq: 988, dur: 0.24, gap: 100 },
    ],
    timerDone: [
      { freq: 1047, dur: 0.26, gap: 0, harmonic: 2 },
      { freq: 1319, dur: 0.34, gap: 140 },
    ],
    restEnd: [
      { freq: 784, dur: 0.22, gap: 0 },
      { freq: 988, dur: 0.3, gap: 120 },
    ],
  },
  /* Ukulele / pop percussivo */
  som_pop: {
    click: { freq: 1040, type: 'square', dur: 0.035, gain: 0.04 },
    success: [
      { freq: 698, type: 'square', dur: 0.055, gap: 0 },
      { freq: 880, type: 'square', dur: 0.055, gap: 50 },
      { freq: 1047, type: 'square', dur: 0.07, gap: 50 },
    ],
    complete: { freq: 880, type: 'square', dur: 0.065, gain: 0.045 },
    rest: { freq: 587, type: 'triangle', dur: 0.1, gain: 0.035 },
    unlock: [
      { freq: 587, type: 'square', dur: 0.045, gap: 0 },
      { freq: 698, type: 'square', dur: 0.045, gap: 42 },
      { freq: 880, type: 'square', dur: 0.055, gap: 42 },
      { freq: 1047, type: 'square', dur: 0.075, gap: 42 },
    ],
    levelUp: [
      { freq: 523, type: 'square', dur: 0.05, gap: 0 },
      { freq: 659, type: 'square', dur: 0.05, gap: 45 },
      { freq: 784, type: 'square', dur: 0.06, gap: 45 },
      { freq: 988, type: 'square', dur: 0.08, gap: 45 },
    ],
    streak: [
      { freq: 659, type: 'square', dur: 0.04, gap: 0 },
      { freq: 784, type: 'square', dur: 0.05, gap: 38 },
      { freq: 988, type: 'square', dur: 0.07, gap: 38 },
    ],
    tabSwitch: { freq: 740, type: 'square', dur: 0.03, gain: 0.035 },
    purchase: [
      { freq: 784, type: 'square', dur: 0.05, gap: 0 },
      { freq: 988, type: 'square', dur: 0.07, gap: 48 },
    ],
    equip: [
      { freq: 659, type: 'square', dur: 0.04, gap: 0 },
      { freq: 784, type: 'square', dur: 0.055, gap: 40 },
    ],
    timerDone: [
      { freq: 880, type: 'square', dur: 0.08, gap: 0 },
      { freq: 1047, type: 'square', dur: 0.12, gap: 70 },
    ],
    restEnd: [
      { freq: 659, type: 'square', dur: 0.06, gap: 0 },
      { freq: 784, type: 'square', dur: 0.09, gap: 65 },
    ],
  },
  /* Synth arcade — arpejos rápidos */
  som_arcade: {
    click: { freq: 1200, type: 'square', dur: 0.03, gain: 0.05 },
    success: [
      { freq: 784, type: 'square', dur: 0.045, gap: 0 },
      { freq: 988, type: 'square', dur: 0.045, gap: 38 },
      { freq: 1175, type: 'square', dur: 0.05, gap: 38 },
      { freq: 1319, type: 'square', dur: 0.06, gap: 38 },
    ],
    complete: { freq: 988, type: 'square', dur: 0.055, gain: 0.055 },
    rest: { freq: 620, type: 'square', dur: 0.065, gain: 0.04 },
    unlock: [
      { freq: 880, type: 'square', dur: 0.04, gap: 0 },
      { freq: 988, type: 'square', dur: 0.04, gap: 32 },
      { freq: 1175, type: 'square', dur: 0.05, gap: 32 },
      { freq: 1319, type: 'square', dur: 0.07, gap: 32 },
    ],
    levelUp: [
      { freq: 659, type: 'square', dur: 0.04, gap: 0 },
      { freq: 784, type: 'square', dur: 0.04, gap: 32 },
      { freq: 988, type: 'square', dur: 0.045, gap: 32 },
      { freq: 1175, type: 'square', dur: 0.05, gap: 32 },
      { freq: 1319, type: 'square', dur: 0.065, gap: 32 },
    ],
    streak: [
      { freq: 988, type: 'square', dur: 0.035, gap: 0 },
      { freq: 1175, type: 'square', dur: 0.04, gap: 30 },
      { freq: 1319, type: 'square', dur: 0.055, gap: 30 },
    ],
    tabSwitch: { freq: 880, type: 'square', dur: 0.025, gain: 0.04 },
    purchase: [
      { freq: 988, type: 'square', dur: 0.04, gap: 0 },
      { freq: 1175, type: 'square', dur: 0.055, gap: 35 },
    ],
    equip: [
      { freq: 784, type: 'square', dur: 0.035, gap: 0 },
      { freq: 988, type: 'square', dur: 0.045, gap: 30 },
    ],
    timerDone: [
      { freq: 1175, type: 'square', dur: 0.07, gap: 0 },
      { freq: 1319, type: 'square', dur: 0.1, gap: 60 },
    ],
    restEnd: [
      { freq: 784, type: 'square', dur: 0.05, gap: 0 },
      { freq: 988, type: 'square', dur: 0.07, gap: 55 },
      { freq: 1175, type: 'square', dur: 0.09, gap: 55 },
    ],
  },
  /* Órgão retro */
  som_retro: {
    click: { freq: 680, type: 'sawtooth', dur: 0.06, gain: 0.035 },
    success: [
      { freq: 494, type: 'sawtooth', dur: 0.1, gap: 0, harmonic: 2 },
      { freq: 622, type: 'sawtooth', dur: 0.1, gap: 80 },
      { freq: 740, type: 'sawtooth', dur: 0.12, gap: 80, harmonic: 2 },
    ],
    complete: { freq: 600, type: 'sawtooth', dur: 0.11, gain: 0.045 },
    rest: { freq: 370, type: 'triangle', dur: 0.14, gain: 0.035 },
    unlock: [
      { freq: 494, type: 'sawtooth', dur: 0.08, gap: 0 },
      { freq: 622, type: 'sawtooth', dur: 0.08, gap: 70 },
      { freq: 740, type: 'sawtooth', dur: 0.09, gap: 70 },
      { freq: 880, type: 'sawtooth', dur: 0.12, gap: 70, harmonic: 2 },
    ],
    levelUp: [
      { freq: 440, type: 'sawtooth', dur: 0.09, gap: 0 },
      { freq: 554, type: 'sawtooth', dur: 0.09, gap: 65 },
      { freq: 659, type: 'sawtooth', dur: 0.11, gap: 65 },
      { freq: 880, type: 'sawtooth', dur: 0.14, gap: 65, harmonic: 2 },
    ],
    streak: [
      { freq: 370, type: 'sawtooth', dur: 0.08, gap: 0 },
      { freq: 494, type: 'sawtooth', dur: 0.1, gap: 60 },
      { freq: 622, type: 'sawtooth', dur: 0.12, gap: 60 },
    ],
    tabSwitch: { freq: 554, type: 'sawtooth', dur: 0.05, gain: 0.035 },
    purchase: [
      { freq: 622, type: 'sawtooth', dur: 0.08, gap: 0 },
      { freq: 740, type: 'sawtooth', dur: 0.11, gap: 60 },
    ],
    equip: [
      { freq: 494, type: 'sawtooth', dur: 0.07, gap: 0 },
      { freq: 622, type: 'sawtooth', dur: 0.09, gap: 55 },
    ],
    timerDone: [
      { freq: 740, type: 'sawtooth', dur: 0.1, gap: 0 },
      { freq: 880, type: 'sawtooth', dur: 0.14, gap: 80 },
    ],
    restEnd: [
      { freq: 554, type: 'sawtooth', dur: 0.09, gap: 0 },
      { freq: 659, type: 'sawtooth', dur: 0.12, gap: 70 },
    ],
  },
  /* Chip 8-bit compacto */
  som_pixel: {
    click: { freq: 640, type: 'square', dur: 0.02, gain: 0.045 },
    success: [
      { freq: 440, type: 'square', dur: 0.035, gap: 0 },
      { freq: 554, type: 'square', dur: 0.035, gap: 28 },
      { freq: 659, type: 'square', dur: 0.04, gap: 28 },
    ],
    complete: { freq: 520, type: 'square', dur: 0.04, gain: 0.05 },
    rest: { freq: 330, type: 'square', dur: 0.045, gain: 0.035 },
    unlock: [
      { freq: 440, type: 'square', dur: 0.03, gap: 0 },
      { freq: 554, type: 'square', dur: 0.03, gap: 24 },
      { freq: 659, type: 'square', dur: 0.035, gap: 24 },
      { freq: 880, type: 'square', dur: 0.045, gap: 24 },
    ],
    levelUp: [
      { freq: 392, type: 'square', dur: 0.03, gap: 0 },
      { freq: 494, type: 'square', dur: 0.03, gap: 24 },
      { freq: 587, type: 'square', dur: 0.035, gap: 24 },
      { freq: 784, type: 'square', dur: 0.045, gap: 24 },
    ],
    streak: [
      { freq: 523, type: 'square', dur: 0.025, gap: 0 },
      { freq: 659, type: 'square', dur: 0.03, gap: 22 },
      { freq: 784, type: 'square', dur: 0.04, gap: 22 },
    ],
    tabSwitch: { freq: 523, type: 'square', dur: 0.02, gain: 0.035 },
    purchase: [
      { freq: 659, type: 'square', dur: 0.03, gap: 0 },
      { freq: 784, type: 'square', dur: 0.04, gap: 26 },
    ],
    equip: [
      { freq: 440, type: 'square', dur: 0.025, gap: 0 },
      { freq: 554, type: 'square', dur: 0.035, gap: 22 },
    ],
    timerDone: [
      { freq: 784, type: 'square', dur: 0.05, gap: 0 },
      { freq: 988, type: 'square', dur: 0.07, gap: 40 },
    ],
    restEnd: [
      { freq: 523, type: 'square', dur: 0.035, gap: 0 },
      { freq: 659, type: 'square', dur: 0.045, gap: 35 },
    ],
  },
  /* Guitarra metal — graves distorcidos */
  som_metal: {
    click: { freq: 196, type: 'sawtooth', dur: 0.1, gain: 0.055, harmonic: 1.5 },
    success: [
      { freq: 165, type: 'sawtooth', dur: 0.12, gap: 0, harmonic: 2 },
      { freq: 196, type: 'sawtooth', dur: 0.12, gap: 95 },
      { freq: 247, type: 'sawtooth', dur: 0.15, gap: 95, harmonic: 2 },
    ],
    complete: { freq: 220, type: 'sawtooth', dur: 0.14, gain: 0.06, harmonic: 1.5 },
    rest: { freq: 147, type: 'sawtooth', dur: 0.18, gain: 0.045 },
    unlock: [
      { freq: 165, type: 'sawtooth', dur: 0.1, gap: 0 },
      { freq: 196, type: 'sawtooth', dur: 0.1, gap: 85 },
      { freq: 247, type: 'sawtooth', dur: 0.12, gap: 85 },
      { freq: 294, type: 'sawtooth', dur: 0.16, gap: 85, harmonic: 2 },
    ],
    levelUp: [
      { freq: 147, type: 'sawtooth', dur: 0.1, gap: 0 },
      { freq: 175, type: 'sawtooth', dur: 0.1, gap: 80 },
      { freq: 220, type: 'sawtooth', dur: 0.12, gap: 80 },
      { freq: 294, type: 'sawtooth', dur: 0.18, gap: 80, harmonic: 2 },
    ],
    streak: [
      { freq: 131, type: 'sawtooth', dur: 0.1, gap: 0 },
      { freq: 165, type: 'sawtooth', dur: 0.12, gap: 70 },
      { freq: 196, type: 'sawtooth', dur: 0.15, gap: 70 },
    ],
    tabSwitch: { freq: 175, type: 'sawtooth', dur: 0.08, gain: 0.04 },
    purchase: [
      { freq: 196, type: 'sawtooth', dur: 0.1, gap: 0 },
      { freq: 247, type: 'sawtooth', dur: 0.14, gap: 75 },
    ],
    equip: [
      { freq: 165, type: 'sawtooth', dur: 0.09, gap: 0 },
      { freq: 196, type: 'sawtooth', dur: 0.12, gap: 65 },
    ],
    timerDone: [
      { freq: 220, type: 'sawtooth', dur: 0.14, gap: 0 },
      { freq: 294, type: 'sawtooth', dur: 0.2, gap: 90 },
    ],
    restEnd: [
      { freq: 175, type: 'sawtooth', dur: 0.12, gap: 0 },
      { freq: 220, type: 'sawtooth', dur: 0.16, gap: 80 },
    ],
  },
  /* Fanfarra épica — metais */
  som_epico: {
    click: { freq: 740, type: 'triangle', dur: 0.09, gain: 0.05, harmonic: 2 },
    success: [
      { freq: 523, dur: 0.13, gap: 0, harmonic: 2 },
      { freq: 659, dur: 0.13, gap: 95 },
      { freq: 784, dur: 0.15, gap: 95 },
      { freq: 988, dur: 0.2, gap: 95, harmonic: 2 },
    ],
    complete: { freq: 880, type: 'triangle', dur: 0.16, gain: 0.06, harmonic: 2 },
    rest: { freq: 440, type: 'sine', dur: 0.2, gain: 0.035 },
    unlock: [
      { freq: 523, dur: 0.11, gap: 0 },
      { freq: 659, dur: 0.11, gap: 85 },
      { freq: 784, dur: 0.13, gap: 85 },
      { freq: 988, dur: 0.18, gap: 85 },
      { freq: 1175, dur: 0.24, gap: 85, harmonic: 2 },
    ],
    levelUp: [
      { freq: 440, dur: 0.1, gap: 0, harmonic: 2 },
      { freq: 554, dur: 0.1, gap: 75 },
      { freq: 659, dur: 0.12, gap: 75 },
      { freq: 880, dur: 0.16, gap: 75 },
      { freq: 1047, dur: 0.22, gap: 75, harmonic: 2 },
    ],
    streak: [
      { freq: 523, dur: 0.1, gap: 0 },
      { freq: 659, dur: 0.12, gap: 70 },
      { freq: 784, dur: 0.16, gap: 70, harmonic: 2 },
    ],
    tabSwitch: { freq: 659, type: 'triangle', dur: 0.07, gain: 0.04, harmonic: 2 },
    purchase: [
      { freq: 740, dur: 0.1, gap: 0 },
      { freq: 988, dur: 0.14, gap: 70, harmonic: 2 },
    ],
    equip: [
      { freq: 523, dur: 0.08, gap: 0 },
      { freq: 659, dur: 0.11, gap: 60 },
    ],
    timerDone: [
      { freq: 880, dur: 0.14, gap: 0, harmonic: 2 },
      { freq: 1047, dur: 0.2, gap: 100 },
    ],
    restEnd: [
      { freq: 659, dur: 0.12, gap: 0 },
      { freq: 784, dur: 0.16, gap: 85 },
      { freq: 988, dur: 0.2, gap: 85 },
    ],
  },
  /* Harpa de cristal */
  som_cristal: {
    click: { freq: 1568, type: 'sine', dur: 0.26, gain: 0.04, harmonic: 2.5 },
    success: [
      { freq: 988, dur: 0.28, gap: 0, harmonic: 2 },
      { freq: 1175, dur: 0.28, gap: 145 },
      { freq: 1318, dur: 0.32, gap: 145 },
      { freq: 1568, dur: 0.36, gap: 145, harmonic: 2 },
    ],
    complete: { freq: 1318, type: 'sine', dur: 0.3, gain: 0.045, harmonic: 2 },
    rest: { freq: 784, type: 'sine', dur: 0.32, gain: 0.03 },
    unlock: [
      { freq: 988, dur: 0.22, gap: 0, harmonic: 2 },
      { freq: 1175, dur: 0.22, gap: 115 },
      { freq: 1318, dur: 0.26, gap: 115 },
      { freq: 1568, dur: 0.32, gap: 115 },
      { freq: 1760, dur: 0.38, gap: 115, harmonic: 2 },
    ],
    levelUp: [
      { freq: 784, dur: 0.2, gap: 0, harmonic: 2 },
      { freq: 988, dur: 0.22, gap: 110 },
      { freq: 1175, dur: 0.26, gap: 110 },
      { freq: 1568, dur: 0.34, gap: 110, harmonic: 2 },
    ],
    streak: [
      { freq: 1175, dur: 0.24, gap: 0, harmonic: 2 },
      { freq: 1568, dur: 0.32, gap: 100 },
    ],
    tabSwitch: { freq: 1318, type: 'sine', dur: 0.16, gain: 0.03, harmonic: 2 },
    purchase: [
      { freq: 1175, dur: 0.2, gap: 0, harmonic: 2 },
      { freq: 1568, dur: 0.28, gap: 110 },
    ],
    equip: [
      { freq: 988, dur: 0.18, gap: 0 },
      { freq: 1318, dur: 0.24, gap: 95 },
    ],
    timerDone: [
      { freq: 1568, dur: 0.28, gap: 0, harmonic: 2 },
      { freq: 1760, dur: 0.36, gap: 120 },
    ],
    restEnd: [
      { freq: 988, dur: 0.22, gap: 0 },
      { freq: 1318, dur: 0.3, gap: 110 },
    ],
  },
  /* Shakuhachi / zen — pentatônica lenta */
  som_zen: {
    click: { freq: 392, type: 'sine', dur: 0.24, gain: 0.028 },
    success: [
      { freq: 262, dur: 0.32, gap: 0 },
      { freq: 294, dur: 0.34, gap: 170 },
      { freq: 330, dur: 0.36, gap: 170 },
      { freq: 392, dur: 0.4, gap: 170 },
    ],
    complete: { freq: 349, type: 'sine', dur: 0.34, gain: 0.032 },
    rest: { freq: 220, type: 'sine', dur: 0.4, gain: 0.026 },
    unlock: [
      { freq: 220, dur: 0.28, gap: 0 },
      { freq: 262, dur: 0.28, gap: 150 },
      { freq: 294, dur: 0.3, gap: 150 },
      { freq: 330, dur: 0.32, gap: 150 },
      { freq: 392, dur: 0.38, gap: 150 },
    ],
    levelUp: [
      { freq: 220, dur: 0.26, gap: 0 },
      { freq: 262, dur: 0.28, gap: 140 },
      { freq: 294, dur: 0.3, gap: 140 },
      { freq: 392, dur: 0.38, gap: 140 },
    ],
    streak: [
      { freq: 262, dur: 0.28, gap: 0 },
      { freq: 330, dur: 0.34, gap: 120 },
      { freq: 392, dur: 0.4, gap: 120 },
    ],
    tabSwitch: { freq: 294, type: 'sine', dur: 0.18, gain: 0.025 },
    purchase: [
      { freq: 330, dur: 0.24, gap: 0 },
      { freq: 392, dur: 0.32, gap: 130 },
    ],
    equip: [
      { freq: 262, dur: 0.22, gap: 0 },
      { freq: 330, dur: 0.28, gap: 110 },
    ],
    timerDone: [
      { freq: 330, dur: 0.3, gap: 0 },
      { freq: 392, dur: 0.38, gap: 140 },
    ],
    restEnd: [
      { freq: 294, dur: 0.28, gap: 0 },
      { freq: 392, dur: 0.36, gap: 120 },
    ],
  },
  /* Marimba — saltitante */
  som_bolha: {
    click: { freq: 1100, type: 'sine', dur: 0.04, gain: 0.042 },
    success: [
      { freq: 740, dur: 0.055, gap: 0 },
      { freq: 880, dur: 0.055, gap: 38 },
      { freq: 988, dur: 0.06, gap: 38 },
      { freq: 1100, dur: 0.065, gap: 38 },
      { freq: 1245, dur: 0.075, gap: 38 },
    ],
    complete: { freq: 988, type: 'sine', dur: 0.07, gain: 0.045 },
    rest: { freq: 660, type: 'sine', dur: 0.09, gain: 0.035 },
    unlock: [
      { freq: 660, dur: 0.045, gap: 0 },
      { freq: 740, dur: 0.045, gap: 32 },
      { freq: 880, dur: 0.05, gap: 32 },
      { freq: 988, dur: 0.055, gap: 32 },
      { freq: 1100, dur: 0.065, gap: 32 },
    ],
    levelUp: [
      { freq: 587, dur: 0.045, gap: 0 },
      { freq: 740, dur: 0.05, gap: 35 },
      { freq: 880, dur: 0.055, gap: 35 },
      { freq: 1100, dur: 0.07, gap: 35 },
    ],
    streak: [
      { freq: 740, dur: 0.04, gap: 0 },
      { freq: 880, dur: 0.05, gap: 32 },
      { freq: 1100, dur: 0.065, gap: 32 },
    ],
    tabSwitch: { freq: 880, type: 'sine', dur: 0.035, gain: 0.035 },
    purchase: [
      { freq: 880, dur: 0.05, gap: 0 },
      { freq: 1100, dur: 0.065, gap: 38 },
    ],
    equip: [
      { freq: 740, dur: 0.04, gap: 0 },
      { freq: 988, dur: 0.055, gap: 32 },
    ],
    timerDone: [
      { freq: 988, dur: 0.07, gap: 0 },
      { freq: 1245, dur: 0.1, gap: 55 },
    ],
    restEnd: [
      { freq: 740, dur: 0.055, gap: 0 },
      { freq: 988, dur: 0.075, gap: 50 },
    ],
  },
  /* NES 8-bit */
  som_8bit: {
    click: { freq: 523, type: 'square', dur: 0.018, gain: 0.055 },
    success: [
      { freq: 262, type: 'square', dur: 0.03, gap: 0 },
      { freq: 330, type: 'square', dur: 0.03, gap: 24 },
      { freq: 392, type: 'square', dur: 0.035, gap: 24 },
      { freq: 523, type: 'square', dur: 0.045, gap: 24 },
    ],
    complete: { freq: 440, type: 'square', dur: 0.035, gain: 0.055 },
    rest: { freq: 196, type: 'square', dur: 0.04, gain: 0.045 },
    unlock: [
      { freq: 262, type: 'square', dur: 0.025, gap: 0 },
      { freq: 330, type: 'square', dur: 0.025, gap: 20 },
      { freq: 392, type: 'square', dur: 0.03, gap: 20 },
      { freq: 523, type: 'square', dur: 0.035, gap: 20 },
      { freq: 659, type: 'square', dur: 0.045, gap: 20 },
    ],
    levelUp: [
      { freq: 262, type: 'square', dur: 0.025, gap: 0 },
      { freq: 330, type: 'square', dur: 0.025, gap: 20 },
      { freq: 392, type: 'square', dur: 0.03, gap: 20 },
      { freq: 523, type: 'square', dur: 0.035, gap: 20 },
      { freq: 659, type: 'square', dur: 0.045, gap: 20 },
    ],
    streak: [
      { freq: 392, type: 'square', dur: 0.022, gap: 0 },
      { freq: 523, type: 'square', dur: 0.028, gap: 18 },
      { freq: 659, type: 'square', dur: 0.038, gap: 18 },
    ],
    tabSwitch: { freq: 440, type: 'square', dur: 0.018, gain: 0.04 },
    purchase: [
      { freq: 523, type: 'square', dur: 0.028, gap: 0 },
      { freq: 659, type: 'square', dur: 0.038, gap: 22 },
    ],
    equip: [
      { freq: 392, type: 'square', dur: 0.022, gap: 0 },
      { freq: 523, type: 'square', dur: 0.032, gap: 18 },
    ],
    timerDone: [
      { freq: 659, type: 'square', dur: 0.04, gap: 0 },
      { freq: 784, type: 'square', dur: 0.055, gap: 35 },
    ],
    restEnd: [
      { freq: 440, type: 'square', dur: 0.03, gap: 0 },
      { freq: 523, type: 'square', dur: 0.04, gap: 28 },
    ],
  },
  /* Apito de treino / corneta */
  som_treino: {
    click: { freq: 840, type: 'triangle', dur: 0.055, gain: 0.05, harmonic: 2 },
    success: [
      { freq: 440, dur: 0.085, gap: 0, harmonic: 2 },
      { freq: 554, dur: 0.085, gap: 58 },
      { freq: 659, dur: 0.095, gap: 58 },
      { freq: 740, dur: 0.105, gap: 58 },
      { freq: 880, dur: 0.125, gap: 58, harmonic: 2 },
    ],
    complete: { freq: 740, type: 'triangle', dur: 0.11, gain: 0.055, harmonic: 2 },
    rest: { freq: 494, type: 'triangle', dur: 0.14, gain: 0.04 },
    unlock: [
      { freq: 554, dur: 0.075, gap: 0 },
      { freq: 659, dur: 0.075, gap: 52 },
      { freq: 740, dur: 0.085, gap: 52 },
      { freq: 880, dur: 0.105, gap: 52 },
      { freq: 988, dur: 0.145, gap: 52, harmonic: 2 },
    ],
    levelUp: [
      { freq: 440, dur: 0.07, gap: 0, harmonic: 2 },
      { freq: 554, dur: 0.07, gap: 50 },
      { freq: 659, dur: 0.08, gap: 50 },
      { freq: 880, dur: 0.12, gap: 50 },
    ],
    streak: [
      { freq: 554, dur: 0.06, gap: 0 },
      { freq: 659, dur: 0.08, gap: 45 },
      { freq: 880, dur: 0.12, gap: 45, harmonic: 2 },
    ],
    tabSwitch: { freq: 659, type: 'triangle', dur: 0.045, gain: 0.04 },
    purchase: [
      { freq: 740, dur: 0.07, gap: 0 },
      { freq: 988, dur: 0.1, gap: 55, harmonic: 2 },
    ],
    equip: [
      { freq: 554, dur: 0.06, gap: 0 },
      { freq: 740, dur: 0.085, gap: 48 },
    ],
    timerDone: [
      { freq: 880, dur: 0.12, gap: 0, harmonic: 2 },
      { freq: 1047, dur: 0.18, gap: 85 },
    ],
    restEnd: [
      { freq: 659, dur: 0.09, gap: 0 },
      { freq: 880, dur: 0.13, gap: 70 },
    ],
  },
  /* Tímpanos / boss */
  som_boss: {
    click: { freq: 110, type: 'sawtooth', dur: 0.18, gain: 0.065 },
    success: [
      { freq: 98, type: 'sawtooth', dur: 0.18, gap: 0 },
      { freq: 123, type: 'sawtooth', dur: 0.18, gap: 105 },
      { freq: 147, type: 'sawtooth', dur: 0.2, gap: 105 },
      { freq: 196, type: 'sawtooth', dur: 0.26, gap: 105 },
    ],
    complete: { freq: 165, type: 'sawtooth', dur: 0.22, gain: 0.07 },
    rest: { freq: 82, type: 'sawtooth', dur: 0.26, gain: 0.055 },
    unlock: [
      { freq: 82, type: 'sawtooth', dur: 0.16, gap: 0 },
      { freq: 98, type: 'sawtooth', dur: 0.16, gap: 95 },
      { freq: 123, type: 'sawtooth', dur: 0.18, gap: 95 },
      { freq: 147, type: 'sawtooth', dur: 0.2, gap: 95 },
      { freq: 196, type: 'sawtooth', dur: 0.28, gap: 95 },
    ],
    levelUp: [
      { freq: 82, type: 'sawtooth', dur: 0.14, gap: 0 },
      { freq: 98, type: 'sawtooth', dur: 0.14, gap: 90 },
      { freq: 123, type: 'sawtooth', dur: 0.16, gap: 90 },
      { freq: 196, type: 'sawtooth', dur: 0.24, gap: 90 },
    ],
    streak: [
      { freq: 73, type: 'sawtooth', dur: 0.14, gap: 0 },
      { freq: 98, type: 'sawtooth', dur: 0.16, gap: 80 },
      { freq: 147, type: 'sawtooth', dur: 0.22, gap: 80 },
    ],
    tabSwitch: { freq: 98, type: 'sawtooth', dur: 0.1, gain: 0.045 },
    purchase: [
      { freq: 123, type: 'sawtooth', dur: 0.14, gap: 0 },
      { freq: 165, type: 'sawtooth', dur: 0.2, gap: 85 },
    ],
    equip: [
      { freq: 98, type: 'sawtooth', dur: 0.12, gap: 0 },
      { freq: 123, type: 'sawtooth', dur: 0.16, gap: 75 },
    ],
    timerDone: [
      { freq: 147, type: 'sawtooth', dur: 0.2, gap: 0 },
      { freq: 196, type: 'sawtooth', dur: 0.28, gap: 100 },
    ],
    restEnd: [
      { freq: 98, type: 'sawtooth', dur: 0.16, gap: 0 },
      { freq: 147, type: 'sawtooth', dur: 0.22, gap: 90 },
    ],
  },
  /* Piano noturno — noir */
  som_noturno: {
    click: { freq: 311, type: 'triangle', dur: 0.18, gain: 0.03 },
    success: [
      { freq: 247, dur: 0.22, gap: 0 },
      { freq: 277, dur: 0.22, gap: 125 },
      { freq: 311, dur: 0.24, gap: 125 },
      { freq: 370, dur: 0.28, gap: 125 },
    ],
    complete: { freq: 330, type: 'triangle', dur: 0.24, gain: 0.035 },
    rest: { freq: 220, type: 'sine', dur: 0.32, gain: 0.026 },
    unlock: [
      { freq: 220, dur: 0.2, gap: 0 },
      { freq: 247, dur: 0.2, gap: 105 },
      { freq: 277, dur: 0.22, gap: 105 },
      { freq: 311, dur: 0.24, gap: 105 },
      { freq: 370, dur: 0.3, gap: 105 },
    ],
    levelUp: [
      { freq: 220, dur: 0.18, gap: 0 },
      { freq: 247, dur: 0.2, gap: 100 },
      { freq: 311, dur: 0.24, gap: 100 },
      { freq: 370, dur: 0.3, gap: 100 },
    ],
    streak: [
      { freq: 247, dur: 0.2, gap: 0 },
      { freq: 311, dur: 0.24, gap: 95 },
      { freq: 370, dur: 0.3, gap: 95 },
    ],
    tabSwitch: { freq: 277, type: 'triangle', dur: 0.12, gain: 0.028 },
    purchase: [
      { freq: 311, dur: 0.18, gap: 0 },
      { freq: 370, dur: 0.26, gap: 100 },
    ],
    equip: [
      { freq: 247, dur: 0.16, gap: 0 },
      { freq: 311, dur: 0.22, gap: 90 },
    ],
    timerDone: [
      { freq: 311, dur: 0.24, gap: 0 },
      { freq: 370, dur: 0.32, gap: 110 },
    ],
    restEnd: [
      { freq: 277, dur: 0.2, gap: 0 },
      { freq: 370, dur: 0.28, gap: 95 },
    ],
  },
  /* Trompete de vitória */
  som_vitoria: {
    click: { freq: 784, type: 'triangle', dur: 0.08, gain: 0.055, harmonic: 2 },
    success: [
      { freq: 523, dur: 0.11, gap: 0, harmonic: 2 },
      { freq: 659, dur: 0.11, gap: 68 },
      { freq: 784, dur: 0.13, gap: 68 },
      { freq: 988, dur: 0.15, gap: 68 },
      { freq: 1175, dur: 0.22, gap: 68, harmonic: 2 },
    ],
    complete: { freq: 1047, type: 'triangle', dur: 0.18, gain: 0.065, harmonic: 2 },
    rest: { freq: 523, type: 'sine', dur: 0.16, gain: 0.035 },
    unlock: [
      { freq: 659, dur: 0.1, gap: 0 },
      { freq: 784, dur: 0.1, gap: 62 },
      { freq: 988, dur: 0.12, gap: 62 },
      { freq: 1175, dur: 0.15, gap: 62 },
      { freq: 1319, dur: 0.24, gap: 62, harmonic: 2 },
    ],
    levelUp: [
      { freq: 523, dur: 0.09, gap: 0, harmonic: 2 },
      { freq: 659, dur: 0.09, gap: 62 },
      { freq: 784, dur: 0.11, gap: 62 },
      { freq: 1047, dur: 0.16, gap: 62 },
      { freq: 1175, dur: 0.22, gap: 62, harmonic: 2 },
    ],
    streak: [
      { freq: 659, dur: 0.08, gap: 0 },
      { freq: 784, dur: 0.1, gap: 55 },
      { freq: 988, dur: 0.14, gap: 55, harmonic: 2 },
    ],
    tabSwitch: { freq: 740, type: 'triangle', dur: 0.06, gain: 0.04, harmonic: 2 },
    purchase: [
      { freq: 784, dur: 0.09, gap: 0 },
      { freq: 1047, dur: 0.13, gap: 60, harmonic: 2 },
    ],
    equip: [
      { freq: 659, dur: 0.07, gap: 0 },
      { freq: 784, dur: 0.1, gap: 52 },
    ],
    timerDone: [
      { freq: 988, dur: 0.14, gap: 0, harmonic: 2 },
      { freq: 1175, dur: 0.2, gap: 90 },
    ],
    restEnd: [
      { freq: 659, dur: 0.1, gap: 0 },
      { freq: 784, dur: 0.14, gap: 75 },
      { freq: 988, dur: 0.18, gap: 75 },
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

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainPeak = 0.08,
  harmonic?: number,
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const peak = gainPeak * volume;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(peak, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.start(now);
  osc.stop(now + duration);

  if (harmonic) {
    const hOsc = ctx.createOscillator();
    const hGain = ctx.createGain();
    hOsc.type = type === 'square' || type === 'sawtooth' ? 'triangle' : type;
    hOsc.frequency.value = freq * harmonic;
    hOsc.connect(hGain);
    hGain.connect(ctx.destination);
    hGain.gain.setValueAtTime(peak * 0.42, now);
    hGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.92);
    hOsc.start(now);
    hOsc.stop(now + duration);
  }
}

function playStep(step: ToneStep, fallbackType: OscillatorType = 'sine') {
  playTone(
    step.freq,
    step.dur ?? 0.1,
    step.type ?? fallbackType,
    step.gain ?? 0.07,
    step.harmonic,
  );
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
  playSequence(getPack().levelUp, 'triangle');
}

export function playStreak() {
  playSequence(getPack().streak, 'sine');
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
  const steps = getPack().restEnd;
  const repeats = 3;
  const patternMs = 320;
  for (let i = 0; i < repeats; i++) {
    steps.forEach((step, index) => {
      const innerDelay = steps.slice(0, index).reduce((total, prev) => total + (prev.gap ?? 80), 0);
      setTimeout(() => playStep(step, 'triangle'), i * patternMs + innerDelay);
    });
  }
}

export function playTimerDone() {
  playSequence(getPack().timerDone, 'triangle');
}

export function playWorkoutComplete() {
  playSequence(getPack().success.map((step) => ({ ...step, dur: (step.dur ?? 0.1) + 0.04 })), 'sine');
}

export function playTabSwitch() {
  playStep(getPack().tabSwitch, 'triangle');
}

export function playPurchase() {
  playSequence(getPack().purchase, 'triangle');
}

export function playEquip() {
  playSequence(getPack().equip, 'sine');
}

export function playUnlock() {
  playSequence(getPack().unlock, 'square');
}

/** Som de conquista — pack épico por padrão; usa o som equipado nas configurações. */
export function playAchievementUnlock(customSoundUrl?: string) {
  if (!enabled) return;

  const playEpicDefault = () => {
    playSequence(PACKS.som_epico.levelUp, 'triangle');
    setTimeout(() => playSequence(PACKS.som_epico.unlock.slice(0, 4), 'square'), 380);
  };

  const playUserPack = () => {
    playSequence(getPack().levelUp, 'triangle');
    setTimeout(() => playSequence(getPack().unlock.slice(-2), 'triangle'), 420);
  };

  if (customSoundUrl) {
    void playSafeHtmlAudio(customSoundUrl, playEpicDefault);
    return;
  }

  if (sfxPack !== 'som_classico') {
    playUserPack();
  } else {
    playEpicDefault();
  }
}

async function playSafeHtmlAudio(url: string, fallback: () => void) {
  try {
    const audio = new Audio(url);
    audio.volume = volume;
    await audio.play();
  } catch {
    fallback();
  }
}

export function previewSfxPack(pack: string) {
  const previous = sfxPack;
  if (PACKS[pack]) sfxPack = pack;
  playClick();
  setTimeout(() => playCompleteSet(), 120);
  setTimeout(() => playLevelUp(), 280);
  setTimeout(() => playPurchase(), 620);
  setTimeout(() => playUnlock(), 880);
  sfxPack = previous;
}
