import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi } from "@/platform/audio/voices";
import { vary } from "./mix";

/**
 * The broadcast orchestra's melodic voices: a trumpet section for the
 * fanfare, horns for the big held lines, trombones and tuba under them,
 * and driving strings. Brass is sawtooth waves through a filter that
 * opens as the note is blown, which is what gives it its bite, with a
 * small scoop up into pitch and a vibrato on long notes.
 */

interface Shape {
  attack: number;
  hold: number;
  release: number;
  peak: number;
  /** Filter cutoff at rest, and how far the blow opens it. */
  cutoff: number;
  open: number;
}

/** Oscillators through one filter and one gain that swells, holds and lets go. The last to stop unhooks it. */
function section(engine: AudioEngine, out: AudioNode, at: number, freqs: readonly [OscillatorType, number, number][], shape: Shape, vibrato = 0): void {
  const { ctx } = engine;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 0.9;
  filter.frequency.setValueAtTime(shape.cutoff, at);
  filter.frequency.linearRampToValueAtTime(shape.open, at + shape.attack + 0.02);
  filter.frequency.setTargetAtTime(shape.cutoff * 1.6, at + shape.attack + 0.05, 0.25);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const top = at + Math.max(shape.attack, shape.hold);
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(shape.peak, at + shape.attack);
  gain.gain.setValueAtTime(shape.peak * 0.85, top);
  gain.gain.linearRampToValueAtTime(0, top + shape.release);
  filter.connect(gain).connect(out);
  const end = top + shape.release + 0.05;
  let lfo: OscillatorNode | null = null;
  let depth: GainNode | null = null;
  if (vibrato > 0 && shape.hold > 0.35) {
    lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    depth = ctx.createGain();
    // The vibrato comes in late, as a player leans into a held note.
    depth.gain.setValueAtTime(0, at);
    depth.gain.linearRampToValueAtTime(vibrato, at + 0.3);
    lfo.connect(depth);
    lfo.start(at);
    lfo.stop(end);
  }
  freqs.forEach(([type, f, detune], i) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(f * 0.97, at);
    osc.frequency.exponentialRampToValueAtTime(f, at + 0.04);
    if (depth) depth.connect(osc.detune);
    osc.connect(filter);
    osc.start(at);
    osc.stop(end);
    if (i === freqs.length - 1) osc.onended = () => gain.disconnect();
  });
}

/** Three trumpets on each note: bright and cutting, for the fanfare line and the stabs. */
export function trumpets(engine: AudioEngine, out: AudioNode, notes: readonly number[], at: number, length: number, peak: number): void {
  const freqs = notes.flatMap((n) => [["sawtooth", midi(n), -7], ["sawtooth", midi(n), 7], ["square", midi(n), 0]] as [OscillatorType, number, number][]);
  section(engine, out, at, freqs, { attack: 0.025, hold: length, release: 0.1, peak: vary(peak, 0.04), cutoff: 1200, open: 3400 }, 9);
}

/** French horns: rounder and darker, for the held heroic lines an octave under the trumpets. */
export function horns(engine: AudioEngine, out: AudioNode, notes: readonly number[], at: number, length: number, peak: number): void {
  const freqs = notes.flatMap((n) => [["sawtooth", midi(n), -5], ["triangle", midi(n), 4], ["sawtooth", midi(n - 12), 0]] as [OscillatorType, number, number][]);
  section(engine, out, at, freqs, { attack: 0.07, hold: length, release: 0.25, peak: vary(peak, 0.04), cutoff: 600, open: 1500 }, 6);
}

/** Trombones and tuba on the roots: the weight under the band. */
export function lowBrass(engine: AudioEngine, out: AudioNode, note: number, at: number, length: number, peak: number): void {
  const freqs: [OscillatorType, number, number][] = [["sawtooth", midi(note), -4], ["sawtooth", midi(note), 4], ["sine", midi(note - 12), 0]];
  section(engine, out, at, freqs, { attack: 0.03, hold: length, release: 0.12, peak: vary(peak, 0.05), cutoff: 420, open: 1100 });
}

/** A string section bowing short, hard eighths: the engine room of every sports theme. */
export function strings(engine: AudioEngine, out: AudioNode, notes: readonly number[], at: number, length: number, peak: number): void {
  const freqs = notes.flatMap((n) => [["sawtooth", midi(n), -10], ["sawtooth", midi(n), 10]] as [OscillatorType, number, number][]);
  section(engine, out, at, freqs, { attack: 0.012, hold: length * 0.6, release: length * 0.4, peak: vary(peak, 0.08), cutoff: 1800, open: 2600 });
}
