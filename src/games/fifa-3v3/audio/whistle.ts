import type { AudioEngine } from "@/platform/audio/audio-engine";
import { vary } from "./mix";

/** One blast: when it starts after the first, how long it lasts, and how hard it is blown. */
export interface Blast {
  at: number;
  length: number;
  strength: number;
}

/** The referee's calls. A foul is one sharp, hard blast; full time is short, short, long. */
export const WHISTLES = {
  kickoff: [{ at: 0, length: 0.42, strength: 0.8 }],
  foul: [{ at: 0, length: 0.62, strength: 1 }],
  setpiece: [{ at: 0, length: 0.26, strength: 0.6 }],
  fulltime: [
    { at: 0, length: 0.32, strength: 0.85 },
    { at: 0.5, length: 0.32, strength: 0.85 },
    { at: 1, length: 1.15, strength: 1 },
  ],
} satisfies Record<string, Blast[]>;

/**
 * A pea whistle, synthesised. Blowing makes a bright tone near 3 kHz in
 * the whistle's chamber, and the cork pea spinning inside chops the air
 * many times a second: that gives the warble, a fast wobble in pitch
 * and in loudness, which speeds up as the pea gets going. Breath hisses
 * round the tone, the note chirps up as the blast starts and sags as it
 * stops, and it rings round the stands.
 */
export function blowWhistle(engine: AudioEngine, out: AudioNode, wet: AudioNode, start: number, blasts: readonly Blast[]): void {
  const pitch = vary(2950, 0.025);
  for (const b of blasts) blast(engine, out, wet, start + b.at, b.length, b.strength, pitch);
}

function blast(engine: AudioEngine, out: AudioNode, wet: AudioNode, at: number, length: number, strength: number, f0: number): void {
  const { ctx } = engine;
  const end = at + length;
  const peak = 0.2 * strength;
  const tone = ctx.createOscillator();
  const bright = ctx.createOscillator();
  tone.type = "sine";
  bright.type = "triangle";
  // The chirp: the tone rises into pitch as the breath builds, and sags as it runs out.
  tone.frequency.setValueAtTime(f0 * 0.9, at);
  tone.frequency.exponentialRampToValueAtTime(f0, at + 0.035);
  tone.frequency.setValueAtTime(f0, end - 0.05);
  tone.frequency.exponentialRampToValueAtTime(f0 * 0.95, end);
  bright.frequency.setValueAtTime(f0 * 1.8, at);
  bright.frequency.exponentialRampToValueAtTime(f0 * 2, at + 0.035);
  // The pea: a warble that speeds up from about 24 to 36 times a second.
  const pea = ctx.createOscillator();
  pea.type = "sine";
  pea.frequency.setValueAtTime(vary(24, 0.1), at);
  pea.frequency.linearRampToValueAtTime(vary(36, 0.1), end);
  const shaper = ctx.createWaveShaper();
  // Squared off, so the air is cut sharply as the pea passes the slot.
  shaper.curve = pulseCurve();
  const wobble = ctx.createGain();
  wobble.gain.value = f0 * 0.035;
  const wobbleHi = ctx.createGain();
  wobbleHi.gain.value = f0 * 0.07;
  pea.connect(shaper);
  shaper.connect(wobble).connect(tone.frequency);
  shaper.connect(wobbleHi).connect(bright.frequency);
  // Loudness: the envelope, and the pea chopping it.
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.linearRampToValueAtTime(peak * 1.15, at + 0.012);
  amp.gain.linearRampToValueAtTime(peak, at + 0.06);
  amp.gain.setValueAtTime(peak, end - 0.05);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);
  const chop = ctx.createGain();
  chop.gain.value = 0.62;
  const chopDepth = ctx.createGain();
  chopDepth.gain.value = 0.38;
  shaper.connect(chopDepth).connect(chop.gain);
  const brightLevel = ctx.createGain();
  brightLevel.gain.value = 0.16;
  tone.connect(chop);
  bright.connect(brightLevel).connect(chop);
  // Breath: noise tuned round the tone, and a little open hiss.
  const breath = ctx.createBufferSource();
  breath.buffer = noiseBuffer(ctx, length + 0.1);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = f0;
  band.Q.value = 7;
  const bandLevel = ctx.createGain();
  bandLevel.gain.value = 0.55;
  const hiss = ctx.createBiquadFilter();
  hiss.type = "highpass";
  hiss.frequency.value = 5200;
  const hissLevel = ctx.createGain();
  hissLevel.gain.value = 0.05;
  breath.connect(band).connect(bandLevel).connect(chop);
  breath.connect(hiss).connect(hissLevel).connect(amp);
  chop.connect(amp);
  amp.connect(out);
  const send = ctx.createGain();
  send.gain.value = 0.55;
  amp.connect(send).connect(wet);
  const stopAt = end + 0.05;
  for (const node of [tone, bright, pea, breath]) {
    node.start(at);
    node.stop(stopAt);
  }
  tone.onended = () => {
    amp.disconnect();
    send.disconnect();
  };
}

let pulse: Float32Array<ArrayBuffer> | null = null;

/** A soft edged square: -1 to 1 turned into a pulse that dwells at each end. */
function pulseCurve(): Float32Array<ArrayBuffer> {
  if (pulse) return pulse;
  const n = 256;
  pulse = new Float32Array(n);
  for (let i = 0; i < n; i++) pulse[i] = Math.tanh(((i / (n - 1)) * 2 - 1) * 4);
  return pulse;
}

function noiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}
