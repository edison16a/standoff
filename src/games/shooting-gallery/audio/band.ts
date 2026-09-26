import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";

/**
 * The fairground band both tunes are played by: a band organ with a
 * calliope lead, a brass section, a muted trumpet, a tuba and an upright
 * bass. Every voice is soft edged and a touch uneven in level, so the
 * loop sounds played rather than sequenced.
 */

/** A small random spread around 1, so repeated notes never sound stamped out. */
export function human(spread = 0.12): number {
  return 1 - spread / 2 + Math.random() * spread;
}

interface Shape {
  attack: number;
  release: number;
  peak: number;
  /** Lowpass cutoff at the start and once the note has opened. */
  from: number;
  to: number;
  /** Vibrato depth as a share of the pitch, 0 for none. */
  vibrato?: number;
}

/** Oscillators through one filter and one hold envelope, shared so a chord is no louder than a note. */
function voice(engine: AudioEngine, out: AudioNode, at: number, lengthS: number, oscs: readonly [OscillatorType, number][], shape: Shape): void {
  const { ctx } = engine;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(shape.from, at);
  filter.frequency.exponentialRampToValueAtTime(shape.to, at + Math.max(0.02, shape.attack * 1.5));
  const gain = ctx.createGain();
  const peak = (shape.peak * human(0.1)) / oscs.length;
  const hold = at + Math.max(shape.attack, lengthS);
  const end = hold + shape.release + 0.05;
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak, at + shape.attack);
  gain.gain.setValueAtTime(peak, hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, hold + shape.release);
  filter.connect(gain).connect(out);
  let lfo: OscillatorNode | null = null;
  const depth = ctx.createGain();
  if (shape.vibrato) {
    lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    // In cents, so one LFO bends every oscillator by the same interval.
    depth.gain.value = shape.vibrato;
    lfo.connect(depth);
    lfo.start(at);
    lfo.stop(end);
  }
  oscs.forEach(([type, frequency], i) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    if (lfo) depth.connect(osc.detune);
    osc.connect(filter);
    osc.start(at);
    osc.stop(end);
    if (i === 0) osc.onended = () => gain.disconnect();
  });
}

/** Drawbar partials: the note, its octave and a bright twelfth, or a soft fifteenth for the mellow stops. */
function drawbars(note: number, bright: boolean): [OscillatorType, number][] {
  const f = midi(note);
  return [["sine", f], ["sine", f * 2], bright ? ["triangle", f * 3] : ["sine", f * 4]];
}

/** The calliope lead: a reedy organ note with a quick wobble. */
export function calliope(engine: AudioEngine, out: AudioNode, at: number, note: number, lengthS: number, peak: number): void {
  voice(engine, out, at, lengthS * 0.85, [...drawbars(note, true), ["square", midi(note)]], { attack: 0.01, release: 0.08, peak, from: 2400, to: 2000, vibrato: 18 });
}

/** A band organ chord that swells in and holds, with a slow warble for the lobby. */
export function organ(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], lengthS: number, peak: number, slow = false): void {
  const oscs = notes.flatMap((note) => drawbars(note, !slow));
  const attack = slow ? lengthS * 0.3 : 0.015;
  voice(engine, out, at, lengthS, oscs, { attack, release: slow ? lengthS * 0.5 : 0.1, peak, from: slow ? 900 : 1800, to: slow ? 1300 : 1500, vibrato: slow ? 8 : 0 });
}

/** The brass section: three saws a little apart that swell as the filter opens. */
export function brass(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], lengthS: number, peak: number): void {
  const oscs = notes.flatMap((note): [OscillatorType, number][] => [["sawtooth", midi(note) * 0.997], ["sawtooth", midi(note) * 1.003]]);
  voice(engine, out, at, lengthS, oscs, { attack: 0.03, release: 0.12, peak, from: 500, to: 2000 });
}

/** A muted trumpet: a dark, breathy horn with a slow vibrato. */
export function mutedTrumpet(engine: AudioEngine, out: AudioNode, at: number, note: number, lengthS: number, peak: number): void {
  voice(engine, out, at, lengthS, [["sawtooth", midi(note)], ["triangle", midi(note)]], { attack: 0.06, release: 0.25, peak, from: 400, to: 1100, vibrato: 12 });
  noise(engine, out, at, { filter: "bandpass", frequency: midi(note) * 2, q: 4, attack: 0.03, decay: 0.12, peak: peak * 0.2 });
}

/** The tuba's oom: a round low note with a soft buzz on the front. */
export function tuba(engine: AudioEngine, out: AudioNode, at: number, note: number, lengthS: number, peak: number): void {
  voice(engine, out, at, lengthS, [["sawtooth", midi(note)], ["sine", midi(note)], ["sine", midi(note)]], { attack: 0.02, release: 0.08, peak, from: 700, to: 350 });
}

/** An upright bass: a round low note with the slap of the string on the board. */
export function upright(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, peak = 0.2): void {
  const p = peak * human(0.1);
  tone(engine, out, at, { type: "triangle", frequency: midi(note), attack: 0.006, decay: length, peak: p });
  tone(engine, out, at, { frequency: midi(note), attack: 0.006, decay: length * 1.2, peak: p * 0.8 });
  noise(engine, out, at, { filter: "lowpass", frequency: 500, decay: 0.03, peak: p * 0.35 });
}
