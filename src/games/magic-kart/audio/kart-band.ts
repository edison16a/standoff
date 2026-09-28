import type { AudioEngine } from "@/platform/audio/audio-engine";
import { envelope, midi, noise, tone } from "@/platform/audio/voices";

/**
 * The instruments Magic Kart's two songs are played on: a funk bass with
 * a filter that snaps open on every note, a bright detuned synth lead,
 * brassy synth stabs, a warm pad, an electric piano and a punchy kit.
 * Every voice is filtered at the source too, so even the brightest part
 * stays round under the engines.
 */

/** Starts and stops a set of oscillators through one filter and one envelope. */
function voice(
  engine: AudioEngine,
  out: AudioNode,
  at: number,
  lengthS: number,
  oscs: { type: OscillatorType; note: number; detune?: number }[],
  shape: { attack: number; release: number; peak: number; from: number; to: number; q?: number },
): void {
  const { ctx } = engine;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = shape.q ?? 0.7;
  filter.frequency.setValueAtTime(shape.from, at);
  filter.frequency.exponentialRampToValueAtTime(shape.to, at + Math.max(0.02, lengthS));
  const gain = ctx.createGain();
  // Shared between the oscillators, so a big chord is no louder than one note.
  const peak = shape.peak / oscs.length;
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak, at + shape.attack);
  gain.gain.setValueAtTime(peak, at + Math.max(shape.attack, lengthS));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(shape.attack, lengthS) + shape.release);
  filter.connect(gain).connect(out);
  const end = at + Math.max(shape.attack, lengthS) + shape.release + 0.05;
  oscs.forEach((o, i) => {
    const osc = ctx.createOscillator();
    osc.type = o.type;
    osc.frequency.value = midi(o.note);
    osc.detune.value = o.detune ?? 0;
    osc.connect(filter);
    osc.start(at);
    osc.stop(end);
    if (i === 0) osc.onended = () => gain.disconnect();
  });
}

/** A slap funk bass: the filter snaps open and closes on each note, over a clean sub. */
export function funkBass(engine: AudioEngine, out: AudioNode, at: number, note: number, lengthS: number, peak: number): void {
  voice(engine, out, at, lengthS, [{ type: "sawtooth", note }, { type: "square", note, detune: 5 }], { attack: 0.004, release: 0.06, peak: peak * 0.6, from: 1800, to: 260, q: 3 });
  tone(engine, out, at, { frequency: midi(note - 12), attack: 0.004, decay: lengthS + 0.06, peak });
}

/** The bright lead: two saws spread apart and a square an octave down, opening as it sounds. */
export function synthLead(engine: AudioEngine, out: AudioNode, at: number, note: number, lengthS: number, peak: number): void {
  voice(engine, out, at, lengthS, [
    { type: "sawtooth", note, detune: -9 },
    { type: "sawtooth", note, detune: 9 },
    { type: "square", note: note - 12 },
  ], { attack: 0.012, release: 0.14, peak, from: 1400, to: 3200, q: 1.5 });
}

/** A short brassy chord hit, the push behind the hook. */
export function stab(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], peak: number): void {
  voice(engine, out, at, 0.08, notes.map((note, i) => ({ type: "sawtooth" as const, note, detune: i % 2 ? 7 : -7 })), { attack: 0.006, release: 0.16, peak, from: 2600, to: 700 });
}

/** A warm swell that overlaps the next one, so chords flow into each other with no gap. */
export function pad(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], lengthS: number, peak: number): void {
  const oscs = notes.flatMap((note) => [
    { type: "sawtooth" as const, note, detune: -6 },
    { type: "triangle" as const, note, detune: 6 },
  ]);
  voice(engine, out, at, lengthS, oscs, { attack: lengthS * 0.35, release: lengthS * 0.5, peak, from: 700, to: 1100 });
}

/** An electric piano: a sine body with a soft bell tine on the front, chord rolled a touch. */
export function keys(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], lengthS: number, peak: number): void {
  notes.forEach((note, i) => {
    const t = at + i * 0.018;
    tone(engine, out, t, { frequency: midi(note), attack: 0.006, decay: lengthS, peak });
    tone(engine, out, t, { frequency: midi(note) * 4, attack: 0.002, decay: 0.12, peak: peak * 0.12 });
  });
}

/** A soft sine lead with a slow vibrato, the lobby's hummed melody. */
export function softLead(engine: AudioEngine, out: AudioNode, at: number, note: number, lengthS: number, peak: number): void {
  const { ctx } = engine;
  const f = midi(note);
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = f;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 4.6;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, at);
  depth.gain.linearRampToValueAtTime(f * 0.008, at + Math.min(0.6, lengthS));
  lfo.connect(depth).connect(osc.frequency);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  envelope(gain.gain, at, 0.08, lengthS + 0.3, peak);
  osc.connect(gain).connect(out);
  for (const node of [osc, lfo]) {
    node.start(at);
    node.stop(at + lengthS + 0.5);
  }
  osc.onended = () => gain.disconnect();
}

export const drums = {
  kick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    tone(engine, out, at, { frequency: 140, glideTo: 44, decay: 0.24, peak });
    noise(engine, out, at, { filter: "lowpass", frequency: 900, decay: 0.012, peak: peak * 0.25 });
  },
  snare(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    noise(engine, out, at, { filter: "bandpass", frequency: 1900, q: 0.8, decay: 0.15, peak });
    tone(engine, out, at, { type: "triangle", frequency: 200, glideTo: 160, decay: 0.07, peak: peak * 0.6 });
  },
  clap(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    for (const offset of [0, 0.011, 0.023]) noise(engine, out, at + offset, { filter: "bandpass", frequency: 1300, q: 1.4, decay: offset ? 0.09 : 0.02, peak });
  },
  hat(engine: AudioEngine, out: AudioNode, at: number, peak: number, open = false): void {
    noise(engine, out, at, { filter: "highpass", frequency: 7500, decay: open ? 0.16 : 0.03, peak });
  },
  /** A rising wash of noise into the top of a section. */
  riser(engine: AudioEngine, out: AudioNode, at: number, lengthS: number, peak: number): void {
    noise(engine, out, at, { filter: "bandpass", frequency: 600, sweepTo: 4000, q: 1.2, attack: lengthS * 0.9, decay: 0.1, peak });
  },
};
