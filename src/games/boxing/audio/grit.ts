import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import { human } from "./band";

/**
 * The dirt on the fight song: a soft clipper the drums are pushed into,
 * like a sampler run hot, a record scratch for the turnaround and a
 * short dusty piano stab. It is still gentle; the music's low pass takes
 * the last of the fizz off.
 */

const SHAPERS = new WeakMap<AudioNode, WaveShaperNode>();

/** A tanh curve: loud hits round off and quiet ones pass clean. */
function curve(drive: number) {
  const samples = 1024;
  const data = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    data[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  return data;
}

/** The clipper feeding `out`, made once per output so every drum hit shares it. */
export function grit(engine: AudioEngine, out: AudioNode): AudioNode {
  const known = SHAPERS.get(out);
  if (known) return known;
  const shaper = engine.ctx.createWaveShaper();
  shaper.curve = curve(2.2);
  shaper.oversample = "2x";
  // The clipper adds level, so it is trimmed back to where the clean kit sat.
  const trim = engine.ctx.createGain();
  trim.gain.value = 0.55;
  shaper.connect(trim).connect(out);
  SHAPERS.set(out, shaper);
  return shaper;
}

/** A record scratch: a band of noise pushed forward and pulled back. */
export function scratch(engine: AudioEngine, out: AudioNode, at: number, length: number, peak: number): void {
  noise(engine, out, at, { filter: "bandpass", frequency: 700, sweepTo: 2600, q: 5, attack: 0.01, decay: length * 0.5, peak });
  noise(engine, out, at + length * 0.5, { filter: "bandpass", frequency: 2400, sweepTo: 600, q: 5, attack: 0.01, decay: length * 0.5, peak: peak * 0.8 });
}

/** A chopped piano chord: short, a little out of tune, and dark. */
export function stab(engine: AudioEngine, out: AudioNode, notes: readonly number[], at: number, peak: number): void {
  const p = peak * human(0.12);
  for (const note of notes) {
    tone(engine, out, at, { type: "triangle", frequency: midi(note), detune: (Math.random() - 0.5) * 10, attack: 0.003, decay: 0.28, peak: p });
    tone(engine, out, at, { frequency: midi(note + 12), attack: 0.002, decay: 0.08, peak: p * 0.3 });
  }
}
