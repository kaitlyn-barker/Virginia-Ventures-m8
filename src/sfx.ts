// ============================================================================
// sfx.ts  —  synthesized sound effects for Boss for a Day (no audio files needed)
// Tiny WebAudio jingles, the same approach as Market Harvest. They need no
// files and keep playing inside a WebXR session. The AudioContext can only
// start after the first interaction, so we create it lazily on the first play.
// ============================================================================

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function note(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.18,
  when = 0,
  slideTo?: number,
) {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

// Soft UI tap.
export function sfxClick() {
  note(660, 0.07, "sine", 0.12);
  note(990, 0.05, "sine", 0.06, 0.02);
}
// Money coming in (earning, interest, a reward). An ascending sparkle.
export function sfxCoin() {
  note(880, 0.09, "square", 0.07);
  note(1175, 0.12, "square", 0.07, 0.07);
}
// Money going down (a dip or a cost). Gentle, not scary.
export function sfxDown() {
  note(420, 0.18, "triangle", 0.12, 0, 260);
}
// A new life stage begins.
export function sfxStage() {
  note(330, 0.16, "sine", 0.12, 0, 660);
  note(880, 0.22, "triangle", 0.1, 0.14);
}
// The final report celebration.
export function sfxFanfare() {
  const b = 523.25;
  note(b, 0.16, "triangle", 0.14, 0);
  note(b * 1.25, 0.16, "triangle", 0.14, 0.13);
  note(b * 1.5, 0.16, "triangle", 0.14, 0.26);
  note(b * 2, 0.42, "triangle", 0.16, 0.39);
}
// The mentor has news.
export function sfxNotify() {
  note(587, 0.1, "sine", 0.12);
  note(784, 0.14, "sine", 0.12, 0.09);
}
