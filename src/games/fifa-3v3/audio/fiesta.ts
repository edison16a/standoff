import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import { vary } from "./mix";

/**
 * The stadium band for the match: bright trumpets for the hook, a salsa
 * piano playing the montuno, a terrace choir singing "oh" in the B
 * section, a tumbao bass, and the percussion: surdo, congas, cowbell,
 * shaker and a timbale roll into each turn.
 */

/** Oscillators through a filter and a gain that swells, holds and lets go. The last one to stop unhooks it. */
function held(engine: AudioEngine, out: AudioNode, at: number, parts: readonly (readonly [OscillatorType, number, number])[], shape: { attack: number; hold: number; release: number; peak: number; cutoff: number; open?: number }): OscillatorNode[] {
  const { ctx } = engine;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(shape.cutoff, at);
  if (shape.open) filter.frequency.linearRampToValueAtTime(shape.open, at + shape.attack + 0.03);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const top = at + Math.max(shape.attack, shape.hold);
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(shape.peak, at + shape.attack);
  gain.gain.setValueAtTime(shape.peak, top);
  gain.gain.linearRampToValueAtTime(0, top + shape.release);
  filter.connect(gain).connect(out);
  return parts.map(([type, frequency, detune], i) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = detune;
    osc.connect(filter);
    osc.start(at);
    osc.stop(top + shape.release + 0.05);
    if (i === parts.length - 1) osc.onended = () => gain.disconnect();
    return osc;
  });
}

/** Bright trumpets: a saw pair and a square, lipped up into the note with a quick vibrato. */
export function trumpets(engine: AudioEngine, out: AudioNode, notes: readonly number[], at: number, length: number, peak: number): void {
  const parts = notes.flatMap((note) => [["sawtooth", midi(note), -6], ["sawtooth", midi(note), 6], ["square", midi(note), 0]] as const);
  const oscs = held(engine, out, at, parts, { attack: 0.02, hold: length, release: 0.08, peak: vary(peak, 0.05), cutoff: 1100, open: 2600 });
  const lfo = engine.ctx.createOscillator();
  lfo.frequency.value = 6;
  const depth = engine.ctx.createGain();
  depth.gain.value = length > 0.3 ? 10 : 0;
  lfo.connect(depth);
  for (const osc of oscs) {
    const f = osc.frequency.value;
    osc.frequency.setValueAtTime(f * 0.96, at);
    osc.frequency.exponentialRampToValueAtTime(f, at + 0.035);
    depth.connect(osc.detune);
  }
  lfo.start(at);
  lfo.stop(at + length + 0.15);
}

/** The terrace choir: an "oh" of stacked saws through a round vowel filter, slow to swell. */
export function choir(engine: AudioEngine, out: AudioNode, note: number, at: number, length: number, peak: number): void {
  const parts = [note, note - 12, note - 5].flatMap((n) => [["sawtooth", midi(n), -9], ["sawtooth", midi(n), 9]] as const);
  held(engine, out, at, parts, { attack: 0.12, hold: length, release: 0.35, peak: vary(peak, 0.05), cutoff: 900 });
}

/** A warm held chord under the band, so the sunshine never has gaps in it. */
export function bed(engine: AudioEngine, out: AudioNode, notes: readonly number[], at: number, length: number, peak: number): void {
  const parts = notes.flatMap((note) => [["triangle", midi(note), -8], ["triangle", midi(note), 8]] as const);
  held(engine, out, at, parts, { attack: 0.15, hold: length, release: 0.3, peak, cutoff: 1300 });
}

/** A piano note in octaves, struck hard and let go: the montuno's bright bounce. */
export function piano(engine: AudioEngine, out: AudioNode, notes: readonly number[], at: number, peak: number): void {
  for (const note of notes) {
    const p = vary(peak, 0.1);
    tone(engine, out, at, { type: "triangle", frequency: midi(note), attack: 0.003, decay: 0.35, peak: p });
    tone(engine, out, at, { frequency: midi(note + 12), attack: 0.002, decay: 0.12, peak: p * 0.4 });
  }
}

/** The tumbao bass: round and plucked, landing ahead of the beat. */
export function tumbao(engine: AudioEngine, out: AudioNode, note: number, at: number, length: number, peak: number): void {
  const f = midi(note);
  tone(engine, out, at, { frequency: f, attack: 0.008, decay: length, peak: vary(peak, 0.05) });
  tone(engine, out, at, { type: "triangle", frequency: f * 2, attack: 0.006, decay: length * 0.35, peak: peak * 0.2 });
}

export const percussion = {
  surdo(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    tone(engine, out, at, { frequency: 78, glideTo: 60, attack: 0.004, decay: 0.4, peak: vary(peak, 0.06) });
    noise(engine, out, at, { filter: "lowpass", frequency: 500, decay: 0.04, peak: peak * 0.2 });
  },
  conga(engine: AudioEngine, out: AudioNode, at: number, open: boolean, peak: number): void {
    const f = open ? 330 : 250;
    tone(engine, out, at, { frequency: f * 1.06, glideTo: f, decay: open ? 0.18 : 0.08, peak: vary(peak, 0.08) });
    noise(engine, out, at, { filter: "bandpass", frequency: 1500, q: 1.4, decay: 0.015, peak: peak * 0.4 });
  },
  cowbell(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    for (const f of [587, 845]) tone(engine, out, at, { type: "square", frequency: f, attack: 0.001, decay: 0.09, peak: vary(peak, 0.1) * 0.5 });
  },
  shaker(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    noise(engine, out, at, { filter: "bandpass", frequency: 6000, q: 1.2, attack: 0.01, decay: 0.04, peak: vary(peak, 0.2) });
  },
  /** A stadium clap: a few hands a hair apart. */
  clap(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    for (const offset of [0, 0.009, 0.02]) noise(engine, out, at + offset, { filter: "bandpass", frequency: 1400, q: 1.2, attack: 0.001, decay: 0.05, peak: vary(peak, 0.1) });
  },
  timbale(engine: AudioEngine, out: AudioNode, at: number, high: boolean, peak: number): void {
    tone(engine, out, at, { type: "triangle", frequency: high ? 620 : 480, attack: 0.001, decay: 0.12, peak: vary(peak, 0.1) });
    noise(engine, out, at, { filter: "bandpass", frequency: 3200, q: 1.2, decay: 0.06, peak: peak * 0.5 });
  },
};
