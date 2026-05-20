/** Lightweight sound effects synthesized via WebAudio (no asset files). */

let audioCtx: AudioContext | null = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

function tone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.08, when = 0) {
  const ctx = getCtx();
  if (!ctx) return;
  const startAt = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

let soundEnabled = true;

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}
export function isSoundEnabled() {
  return soundEnabled;
}

/** Tap-style click. */
export function playClick() {
  if (!soundEnabled) return;
  tone(700, 0.06, 'square', 0.04);
}

/** Soft "round added" chime. */
export function playRoundAdded() {
  if (!soundEnabled) return;
  tone(523.25, 0.08, 'triangle', 0.06);          // C5
  tone(783.99, 0.12, 'triangle', 0.06, 0.08);    // G5
}

/** Triumphant chord progression for a match win. */
export function playWin() {
  if (!soundEnabled) return;
  // C - E - G - C ascending arpeggio
  tone(523.25, 0.18, 'triangle', 0.08, 0);
  tone(659.25, 0.18, 'triangle', 0.08, 0.12);
  tone(783.99, 0.22, 'triangle', 0.08, 0.24);
  tone(1046.5, 0.5, 'triangle', 0.09, 0.4);
}

/** Subtle error ping. */
export function playError() {
  if (!soundEnabled) return;
  tone(220, 0.18, 'sawtooth', 0.05);
}
