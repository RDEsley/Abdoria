let enabled = true;
let volume = 0.7;
let audioContext: AudioContext | null = null;

export function setSoundSettings(on: boolean, vol: number) {
  enabled = on;
  volume = Math.max(0, Math.min(1, vol));
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
  playTone(880, 0.06, 'triangle', 0.05);
}

export function playSuccess() {
  playTone(523, 0.1, 'sine', 0.07);
  setTimeout(() => playTone(659, 0.1, 'sine', 0.07), 80);
  setTimeout(() => playTone(784, 0.15, 'sine', 0.08), 160);
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
  playTone(660, 0.08, 'triangle', 0.06);
}

export function playRestStart() {
  playTone(440, 0.1, 'sine', 0.05);
}

export function playUnlock() {
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.1, 'square', 0.055), i * 80);
  });
}
