import type { AudioEngine } from "@/platform/audio/audio-engine";

/**
 * A song as a loop of sixteenth note steps. The player tells it "step n
 * starts at time t" and it books whatever sounds there. `intensity` runs
 * from 0 to 1 and lets one song build up for the final lap.
 */
export interface Song {
  bpm: number;
  steps: number;
  /** How late the offbeat sixteenths land, as a share of a sixteenth. */
  swing: number;
  play(engine: AudioEngine, out: AudioNode, step: number, at: number, intensity: number): void;
}

/** One chord a bar: the bass root first, then the chord tones. */
export type Chord = readonly number[];

export interface Note {
  note: number;
  /** In sixteenths. */
  length: number;
}

/** Reads [step, note, length] rows into a lookup by step, which reads far easier than a wall of slots. */
export function phrase(rows: readonly (readonly [number, number, number])[]): Map<number, Note> {
  return new Map(rows.map(([step, note, length]) => [step, { note, length }]));
}
