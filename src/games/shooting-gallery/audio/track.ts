import type { AudioEngine } from "@/platform/audio/audio-engine";
import { heldFor, type Bar } from "./score";

/**
 * A looping tune the music player can run. It is told "step n starts at
 * time t" and books whatever plays there. Steps are eighth notes.
 */
export interface Track {
  /** Seconds per step (an eighth note). */
  step: number;
  length: number;
  play(engine: AudioEngine, out: AudioNode, step: number, at: number): void;
}

export interface Arrangement {
  bpm: number;
  /** How late the off eighths land, as a share of an eighth. */
  swing: number;
  bars: Bar[];
  /** Plays the rhythm section for one step of a bar. */
  groove(engine: AudioEngine, out: AudioNode, bar: Bar, next: Bar, index: number, inBar: number, at: number, eighth: number): void;
  /** Plays the tune for one step, told which section it is in. */
  melody(engine: AudioEngine, out: AudioNode, note: number, at: number, length: number, section: "A" | "B"): void;
}

/** Turns an arrangement of bars into a track: the first half of the bars is A, the second B. */
export function track(a: Arrangement): Track {
  const eighth = 60 / a.bpm / 2;
  return {
    step: eighth,
    length: a.bars.length * 8,
    play(engine, out, step, at) {
      const index = Math.floor(step / 8);
      const bar = a.bars[index]!;
      const next = a.bars[(index + 1) % a.bars.length]!;
      const inBar = step % 8;
      const time = at + (inBar % 2 === 1 ? a.swing * eighth : 0);
      a.groove(engine, out, bar, next, index, inBar, time, eighth);
      const note = bar.melody[inBar];
      if (note === null || note === undefined) return;
      const section = index < a.bars.length / 2 ? "A" : "B";
      a.melody(engine, out, note, time, heldFor(bar.melody, inBar) * eighth, section);
    },
  };
}
