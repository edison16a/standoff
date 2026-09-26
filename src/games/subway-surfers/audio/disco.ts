import type { AudioEngine } from "@/platform/audio/audio-engine";
import { vary } from "./vary";
import { midi, noise, tone } from "./voices";

/**
 * The disco band for the run: a four on the floor kick, handclaps, open
 * hats on the offbeats, a funky octave bass, a clavinet, and a string
 * section that plays stabs and the hook. The strings and the bass open
 * a filter as they speak, which is most of the disco sparkle.
 */

/** Oscillators through one filter and one gain, the gain swelling in, holding, then letting go. */
function voice(engine: AudioEngine, out: AudioNode, at: number, parts: readonly { type: OscillatorType; f: number; detune: number }[], shape: { attack: number; hold: number; release: number; peak: number; from: number; to: number; q?: number }): BiquadFilterNode {
  const { ctx } = engine;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = shape.q ?? 0.7;
  filter.frequency.setValueAtTime(shape.from, at);
  filter.frequency.exponentialRampToValueAtTime(shape.to, at + shape.attack + 0.02);
  filter.frequency.exponentialRampToValueAtTime(shape.from, at + shape.hold + shape.release);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(shape.peak, at + shape.attack);
  gain.gain.setValueAtTime(shape.peak, at + Math.max(shape.attack, shape.hold));
  gain.gain.linearRampToValueAtTime(0, at + Math.max(shape.attack, shape.hold) + shape.release);
  filter.connect(gain).connect(out);
  const end = at + Math.max(shape.attack, shape.hold) + shape.release + 0.05;
  parts.forEach((part, i) => {
    const osc = ctx.createOscillator();
    osc.type = part.type;
    osc.frequency.value = part.f;
    osc.detune.value = part.detune;
    osc.connect(filter);
    osc.start(at);
    osc.stop(end);
    if (i === parts.length - 1) osc.onended = () => gain.disconnect();
  });
  return filter;
}

export function kick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  tone(engine, out, at, { frequency: 120, glideTo: 48, attack: 0.002, decay: 0.2, peak: peak * vary(0.05) });
  noise(engine, out, at, { filter: "lowpass", frequency: 1400, decay: 0.012, peak: peak * 0.12 });
}

/** A handclap: three quick slaps a hair apart, then the room. */
export function clap(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
  for (const [i, offset] of [0, 0.011, 0.022].entries()) {
    noise(engine, out, at + offset, { filter: "bandpass", frequency: 1250, q: 1.3, attack: 0.001, decay: i === 2 ? 0.14 : 0.012, peak: peak * vary(0.1) });
  }
}

export function hat(engine: AudioEngine, out: AudioNode, at: number, open: boolean, peak: number): void {
  noise(engine, out, at, { filter: "highpass", frequency: open ? 6500 : 8000, attack: 0.002, decay: open ? 0.17 : 0.03, peak: peak * vary(0.15) });
}

/** The octave bass: a saw and a square that bite and close, short enough to bounce. */
export function bass(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, peak: number): void {
  const f = midi(note);
  voice(engine, out, at, [{ type: "sawtooth", f, detune: 0 }, { type: "square", f: f / 2, detune: 3 }, { type: "sine", f, detune: 0 }], {
    attack: 0.006, hold: length * 0.6, release: length * 0.4, peak: peak * vary(0.05), from: 260, to: 1100, q: 2,
  });
}

/** The clavinet: a bright, dry snap of the chord's top notes through a resonant filter. */
export function clav(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], peak: number): void {
  const parts = notes.flatMap((note) => [{ type: "square" as const, f: midi(note), detune: -4 }, { type: "sawtooth" as const, f: midi(note), detune: 5 }]);
  voice(engine, out, at, parts, { attack: 0.003, hold: 0.04, release: 0.09, peak: peak * vary(0.12), from: 700, to: 2600, q: 4 });
}

/** A string stab: a section of detuned saws, quick in and out. */
export function stab(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], length: number, peak: number): void {
  const parts = notes.flatMap((note) => [-9, 0, 9].map((detune) => ({ type: "sawtooth" as const, f: midi(note), detune })));
  voice(engine, out, at, parts, { attack: 0.012, hold: length, release: 0.18, peak, from: 900, to: 2800 });
}

/** The hook on the strings: the note and its octave below, bowed in with a little vibrato. */
export function strings(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, peak: number): void {
  const parts = [note, note - 12].flatMap((n) => [-7, 7].map((detune) => ({ type: "sawtooth" as const, f: midi(n), detune })));
  const filter = voice(engine, out, at, parts, { attack: 0.03, hold: length, release: 0.2, peak, from: 1200, to: 3000 });
  // The vibrato wobbles the filter a touch too, which reads as a bow on the string.
  const lfo = engine.ctx.createOscillator();
  lfo.frequency.value = 5.5;
  const depth = engine.ctx.createGain();
  depth.gain.value = 120;
  lfo.connect(depth).connect(filter.frequency);
  lfo.start(at);
  lfo.stop(at + length + 0.3);
}

/** A string run that sweeps up into the next section: an octave glide under a rising hiss. */
export function rise(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, peak: number): void {
  tone(engine, out, at, { type: "sawtooth", frequency: midi(note - 12), glideTo: midi(note), attack: length * 0.8, decay: length * 0.3, peak });
  noise(engine, out, at, { filter: "bandpass", frequency: 800, sweepTo: 5000, q: 1.2, attack: length * 0.9, decay: 0.1, peak: peak * 0.8 });
}
