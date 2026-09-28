import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";
import { vary } from "./mix";

/**
 * The game band: arena hip hop built to bounce. A booming 808 that
 * slides, a tight kick, a snare with a clap on top, quick hats that roll,
 * short brass stabs for the hook and a bell for the answer. Nothing is
 * held long in the middle of the range, which is where the arena's organ
 * and the stomp stomp clap need their room.
 */

/** The 808: a sine that drops into its note, with a soft triangle so small speakers hear it. */
export function boom(engine: AudioEngine, out: AudioNode, note: number, at: number, length: number, peak: number, slideFrom?: number): void {
  const f = midi(note);
  const start = slideFrom === undefined ? f * 1.6 : midi(slideFrom);
  const { ctx } = engine;
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(start, at);
  osc.frequency.exponentialRampToValueAtTime(f, at + (slideFrom === undefined ? 0.04 : length * 0.5));
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(peak, at + 0.005);
  gain.gain.setValueAtTime(peak, at + length * 0.7);
  gain.gain.linearRampToValueAtTime(0, at + length);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + length + 0.02);
  osc.onended = () => gain.disconnect();
  tone(engine, out, at, { type: "triangle", frequency: f * 2, attack: 0.005, decay: length * 0.4, peak: peak * 0.12 });
}

export const drums = {
  kick(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    tone(engine, out, at, { frequency: 150, glideTo: 55, attack: 0.002, decay: 0.12, peak: vary(peak, 0.05) });
    noise(engine, out, at, { filter: "lowpass", frequency: 1800, decay: 0.01, peak: peak * 0.15 });
  },
  /** Snare and clap together, the clap a hair late so the hit spreads. */
  snare(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    tone(engine, out, at, { type: "triangle", frequency: 210, glideTo: 170, decay: 0.08, peak: peak * 0.6 });
    noise(engine, out, at, { filter: "bandpass", frequency: 1900, q: 0.9, decay: 0.13, peak: vary(peak, 0.08) });
    for (const offset of [0.008, 0.018]) noise(engine, out, at + offset, { filter: "bandpass", frequency: 1300, q: 1.5, attack: 0.001, decay: 0.05, peak: peak * 0.6 });
  },
  hat(engine: AudioEngine, out: AudioNode, at: number, peak: number): void {
    noise(engine, out, at, { filter: "highpass", frequency: 8200, attack: 0.001, decay: 0.025, peak: vary(peak, 0.15) });
  },
};

/** A brass stab: two detuned saws and a square under, bitten off short. */
export function brass(engine: AudioEngine, out: AudioNode, notes: readonly number[], at: number, length: number, peak: number): void {
  const { ctx } = engine;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 1;
  filter.frequency.setValueAtTime(700, at);
  filter.frequency.linearRampToValueAtTime(2400, at + 0.03);
  filter.frequency.exponentialRampToValueAtTime(1000, at + length);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(vary(peak, 0.06), at + 0.015);
  gain.gain.setValueAtTime(peak * 0.8, at + length * 0.7);
  gain.gain.linearRampToValueAtTime(0, at + length + 0.06);
  filter.connect(gain).connect(out);
  const end = at + length + 0.1;
  const parts = notes.flatMap((note): [OscillatorType, number, number][] => [["sawtooth", midi(note), -9], ["sawtooth", midi(note), 9], ["square", midi(note - 12), 0]]);
  parts.forEach(([type, frequency, detune], i) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency * 0.98, at);
    osc.frequency.exponentialRampToValueAtTime(frequency, at + 0.03);
    osc.detune.value = detune;
    osc.connect(filter);
    osc.start(at);
    osc.stop(end);
    if (i === parts.length - 1) osc.onended = () => gain.disconnect();
  });
}

/**
 * A dark synth glow under the chord, an octave below where the organ
 * plays, so the floor never goes dead between hits without crowding it.
 */
export function glow(engine: AudioEngine, out: AudioNode, notes: readonly number[], at: number, length: number, peak: number): void {
  const { ctx } = engine;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 650;
  filter.Q.value = 0.5;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(peak, at + 0.25);
  gain.gain.setValueAtTime(peak, at + length);
  gain.gain.linearRampToValueAtTime(0, at + length + 0.4);
  filter.connect(gain).connect(out);
  const end = at + length + 0.45;
  const parts = notes.flatMap((note) => [[midi(note), -6], [midi(note), 6]] as const);
  parts.forEach(([frequency, detune], i) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = frequency;
    osc.detune.value = detune;
    osc.connect(filter);
    osc.start(at);
    osc.stop(end);
    if (i === parts.length - 1) osc.onended = () => gain.disconnect();
  });
}

/** A bell for the answer: a sine with an inharmonic shimmer that fades first. */
export function bell(engine: AudioEngine, out: AudioNode, note: number, at: number, peak: number): void {
  const f = midi(note);
  tone(engine, out, at, { frequency: f, attack: 0.003, decay: 0.9, peak: vary(peak, 0.08) });
  tone(engine, out, at, { frequency: f * 2.76, attack: 0.002, decay: 0.25, peak: peak * 0.25 });
  tone(engine, out, at, { frequency: f * 5.4, attack: 0.001, decay: 0.08, peak: peak * 0.08 });
}
