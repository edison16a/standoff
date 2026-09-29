import type { AudioEngine } from "@/platform/audio/audio-engine";

/**
 * A referee's whistle, synthesised. A pealess whistle has three
 * chambers tuned a little apart, and their beating gives it the hard,
 * rough edge that cuts through an arena. Breath pressure bends each
 * blast up to pitch at the start and lets it sag at the end, a puff of
 * air noise rides on top, and the tail rings in the room.
 */

/** The three chambers, in hertz, and how loud each sounds. */
const CHAMBERS: readonly [number, number][] = [
  [2980, 1],
  [3140, 0.8],
  [3520, 0.45],
];

export interface Blast {
  /** Seconds from now. */
  at: number;
  /** How long it is held. */
  length: number;
  /** 0 to 1. */
  level: number;
}

/** A foul: one short chirp, then a long hard blast. */
export const FOUL_CALL: readonly Blast[] = [
  { at: 0, length: 0.11, level: 0.75 },
  { at: 0.19, length: 0.62, level: 1 },
];

/** A dead ball, like a violation: one firm blast. */
export const STOP_CALL: readonly Blast[] = [{ at: 0, length: 0.45, level: 0.9 }];

export function playWhistle(engine: AudioEngine, dry: AudioNode, wet: AudioNode, blasts: readonly Blast[], peak = 0.09): void {
  const { ctx } = engine;
  const start = engine.now + 0.005;
  for (const blast of blasts) {
    const at = start + blast.at;
    const end = at + blast.length;
    const out = ctx.createGain();
    out.gain.value = 0;
    // Breath: a quick attack, held, then a short fall as the air stops.
    out.gain.setValueAtTime(0, at);
    out.gain.linearRampToValueAtTime(peak * blast.level, at + 0.012);
    out.gain.setValueAtTime(peak * blast.level * 0.92, end - 0.03);
    out.gain.exponentialRampToValueAtTime(0.0001, end + 0.05);
    out.connect(dry);
    const send = ctx.createGain();
    send.gain.value = 0.35;
    out.connect(send).connect(wet);
    // Slight random tuning each time, as no two blasts are quite alike.
    const drift = 1 + (Math.random() - 0.5) * 0.02;
    for (const [f, gain] of CHAMBERS) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      const g = ctx.createGain();
      g.gain.value = gain / CHAMBERS.length;
      osc.frequency.setValueAtTime(f * drift * 0.93, at);
      osc.frequency.exponentialRampToValueAtTime(f * drift, at + 0.035);
      osc.frequency.setValueAtTime(f * drift, end - 0.04);
      osc.frequency.exponentialRampToValueAtTime(f * drift * 0.96, end + 0.05);
      osc.connect(g).connect(out);
      osc.start(at);
      osc.stop(end + 0.1);
      osc.onended = () => g.disconnect();
    }
    breath(engine, out, at, end);
    setTimeout(() => {
      out.disconnect();
      send.disconnect();
    }, (end - engine.now + 0.3) * 1000);
  }
}

/** The air through the mouthpiece: noise focused around the whistle's pitch. */
function breath(engine: AudioEngine, out: AudioNode, at: number, end: number): void {
  const { ctx } = engine;
  const length = Math.ceil((end - at + 0.1) * ctx.sampleRate);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 3100;
  band.Q.value = 3;
  const g = ctx.createGain();
  g.gain.value = 0.22;
  src.connect(band).connect(g).connect(out);
  src.start(at);
  src.stop(end + 0.08);
  src.onended = () => g.disconnect();
}
