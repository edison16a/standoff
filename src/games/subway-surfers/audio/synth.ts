import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, tone } from "./voices";

/**
 * A touch of neon synth over the band: a plucky arpeggio of detuned
 * square waves, and a glassy pad under the start of each bar. Both stay
 * quiet, so the groove keeps its warmth and the city gets its sparkle.
 */

/** One arpeggio pluck: two detuned squares and a sine an octave up, gone in a flash. */
export function arp(engine: AudioEngine, out: AudioNode, at: number, note: number, peak: number): void {
  const f = midi(note);
  tone(engine, out, at, { type: "square", frequency: f, detune: -7, attack: 0.003, decay: 0.12, peak: peak * 0.5 });
  tone(engine, out, at, { type: "square", frequency: f, detune: 7, attack: 0.003, decay: 0.1, peak: peak * 0.5 });
  tone(engine, out, at, { frequency: f * 2, attack: 0.002, decay: 0.08, peak: peak * 0.6 });
}

/** A soft pad of the chord's top notes, sawtooth softened by the music's low pass, swelling in. */
export function pad(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], length: number, peak: number): void {
  for (const note of notes) {
    tone(engine, out, at, { type: "sawtooth", frequency: midi(note), detune: -5, attack: length * 0.35, decay: length * 0.65, peak });
    tone(engine, out, at, { type: "sawtooth", frequency: midi(note), detune: 6, attack: length * 0.35, decay: length * 0.65, peak });
  }
}

/** Which chord tone the arpeggio plays on each eighth of a bar: up and back, an octave above the voicing. */
const ORDER = [0, 1, 2, 3, 2, 1, 2, 3];

export function arpNote(voicing: readonly number[], inBar: number): number | null {
  if (inBar % 2 !== 0) return null;
  const pick = ORDER[inBar / 2]!;
  return voicing[Math.min(pick, voicing.length - 1)]! + 12;
}
