import { PACKS, type ToneStep } from './catalog';

let enabled = true;
let volume = 0.7;
let sfxPack = 'som_classico';
let audioContext: AudioContext | null = null;

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
  playTone(step.freq, step.dur ?? 0.1, step.type ?? fallbackType, step.gain ?? 0.07, step.harmonic);
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
  playSequence(
    getPack().success.map((step) => ({ ...step, dur: (step.dur ?? 0.1) + 0.04 })),
    'sine',
  );
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

/** Abertura do baú: conserva a identidade do pacote de som equipado. */
export function playChestOpening() {
  const pack = getPack();
  playStep({ ...pack.complete, dur: Math.max(pack.complete.dur ?? 0.1, 0.16) });
  setTimeout(() => playStep(pack.unlock[0] ?? pack.click, 'triangle'), 150);
  setTimeout(() => playStep(pack.unlock[1] ?? pack.complete, 'triangle'), 300);
}

export type ChestRewardRarity = 'lendario' | 'mitico' | 'secret';

/** Assinaturas sonoras próprias para os três tiers mais raros do baú. */
export function playChestRarity(rarity: ChestRewardRarity) {
  if (rarity === 'lendario') {
    playSequence([
      { freq: 523.25, type: 'triangle', dur: 0.12, gap: 0, harmonic: 2 },
      { freq: 659.25, type: 'triangle', dur: 0.14, gap: 85, harmonic: 2 },
      { freq: 987.77, type: 'sine', dur: 0.32, gap: 100, harmonic: 2 },
    ]);
    return;
  }
  if (rarity === 'mitico') {
    playSequence([
      { freq: 392, type: 'sine', dur: 0.1, gap: 0, harmonic: 2 },
      { freq: 622.25, type: 'triangle', dur: 0.12, gap: 65, harmonic: 2 },
      { freq: 830.61, type: 'sine', dur: 0.15, gap: 65, harmonic: 2 },
      { freq: 1244.51, type: 'triangle', dur: 0.36, gap: 80, harmonic: 2 },
    ]);
    return;
  }
  playSequence([
    { freq: 92.5, type: 'sawtooth', dur: 0.24, gap: 0, harmonic: 2 },
    { freq: 740, type: 'sine', dur: 0.08, gap: 130 },
    { freq: 185, type: 'triangle', dur: 0.18, gap: 55, harmonic: 3 },
    { freq: 1480, type: 'sine', dur: 0.4, gap: 90, harmonic: 2 },
  ]);
}

/** Som de conquista — pack épico por padrão; usa o som equipado nas configurações. */
export function playAchievementUnlock(customSoundUrl?: string) {
  if (!enabled) return;

  // Chime curto e suave (estilo notificação da Steam) — sem fanfarra estourada.
  const playDefaultChime = () => {
    playTone(659.25, 0.16, 'sine', 0.04, 2);
    setTimeout(() => playTone(987.77, 0.26, 'sine', 0.035, 2), 140);
  };

  const playUserPack = () => {
    playSequence(
      getPack()
        .unlock.slice(-2)
        .map((step) => ({ ...step, gain: Math.min(step.gain ?? 0.05, 0.05) })),
      'triangle',
    );
  };

  if (customSoundUrl) {
    void playSafeHtmlAudio(customSoundUrl, playDefaultChime);
    return;
  }

  if (sfxPack !== 'som_classico') {
    playUserPack();
  } else {
    playDefaultChime();
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

let previewRestoreTimer: ReturnType<typeof setTimeout> | null = null;

function sequenceDurationMs(steps: ToneStep[]): number {
  if (steps.length === 0) return 0;
  const gapMs = steps.slice(0, -1).reduce((total, step) => total + (step.gap ?? 80), 0);
  const last = steps[steps.length - 1];
  return gapMs + (last.dur ?? 0.1) * 1000 + 80;
}

function playSequenceForPack(
  steps: ToneStep[],
  pack: string,
  fallbackType: OscillatorType = 'sine',
) {
  if (!PACKS[pack]) return;
  steps.forEach((step, index) => {
    const delay = steps.slice(0, index).reduce((total, prev) => total + (prev.gap ?? 80), 0);
    setTimeout(() => {
      const prev = sfxPack;
      sfxPack = pack;
      playStep(step, step.type ?? fallbackType);
      sfxPack = prev;
    }, delay);
  });
}

export function previewSfxPack(pack: string) {
  if (!PACKS[pack]) return;

  if (previewRestoreTimer) {
    clearTimeout(previewRestoreTimer);
    previewRestoreTimer = null;
  }

  const previous = sfxPack;
  sfxPack = pack;

  const def = PACKS[pack];
  const fallbackType = def.click.type ?? 'triangle';
  playStep(def.click, fallbackType);

  const previewStartMs = 90;
  setTimeout(() => playSequenceForPack(def.shopPreview, pack, fallbackType), previewStartMs);

  const previewMs = previewStartMs + sequenceDurationMs(def.shopPreview);
  previewRestoreTimer = setTimeout(
    () => {
      sfxPack = previous;
      previewRestoreTimer = null;
    },
    Math.max(previewMs + 120, 600),
  );
}
