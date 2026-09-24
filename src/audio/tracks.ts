import type { AudioEngine } from "./audio-engine";
import { midi, noise, tone } from "./voices";

/**
 * The two music loops, written as step sequences. A track is told "step
 * n starts at time t" and schedules whatever plays there. Steps are
 * sixteenth notes.
 */
export interface Track {
  bpm: number;
  /** Steps before the pattern repeats. */
  length: number;
  play(engine: AudioEngine, out: AudioNode, step: number, at: number): void;
}

/* Menu: a slow A minor pad with a sparse plucked line over it. */

const MENU_CHORDS = [
  [57, 60, 64, 71], // Am9 without the root doubling
  [53, 57, 60, 64], // Fmaj7
  [48, 55, 59, 64], // Cmaj7
  [55, 59, 62, 64], // G6
];
const MENU_MELODY: (number | null)[] = [76, null, null, 74, null, 72, null, null, 69, null, null, null, 71, null, 72, null];

export const MENU_TRACK: Track = {
  bpm: 72,
  length: 16 * 8,
  play(engine, out, step, at) {
    const beat = 60 / 72;
    if (step % 32 === 0) {
      const chord = MENU_CHORDS[(step / 32) % MENU_CHORDS.length]!;
      for (const note of chord) {
        tone(engine, out, at, { type: "sine", frequency: midi(note), attack: 1.4, decay: beat * 8, peak: 0.05 });
        tone(engine, out, at, { type: "triangle", frequency: midi(note), detune: 7, attack: 1.8, decay: beat * 8, peak: 0.025 });
      }
    }
    if (step % 2 === 0 && step % 64 >= 32) {
      const note = MENU_MELODY[(step / 2) % MENU_MELODY.length];
      if (note) tone(engine, out, at, { type: "triangle", frequency: midi(note), attack: 0.005, decay: 0.9, peak: 0.05 });
    }
  },
};

/* Match: D minor, i VI III VII, driving bass under a straight beat. */

const MATCH_ROOTS = [38, 34, 41, 36]; // D, Bb, F, C
const MATCH_TRIADS = [
  [62, 65, 69],
  [58, 62, 65],
  [60, 65, 69],
  [60, 64, 67],
];
const BASS_PATTERN = [0, 0, 12, 0, 0, 12, 0, 7, 0, 0, 12, 0, 0, 12, 7, 12];

export const MATCH_TRACK: Track = {
  bpm: 124,
  length: 16 * 4,
  play(engine, out, step, at) {
    const bar = Math.floor(step / 16) % MATCH_ROOTS.length;
    const inBar = step % 16;
    const sixteenth = 60 / 124 / 4;

    if (inBar % 4 === 0) {
      tone(engine, out, at, { type: "sine", frequency: 140, glideTo: 45, decay: 0.22, peak: 0.55 });
    }
    if (inBar === 4 || inBar === 12) {
      noise(engine, out, at, { filter: "bandpass", frequency: 1800, q: 0.8, decay: 0.16, peak: 0.25 });
      tone(engine, out, at, { type: "triangle", frequency: 190, glideTo: 140, decay: 0.1, peak: 0.18 });
    }
    if (inBar % 2 === 0) {
      noise(engine, out, at, { filter: "highpass", frequency: 8000, decay: inBar % 4 === 2 ? 0.07 : 0.03, peak: 0.08 });
    }

    const root = MATCH_ROOTS[bar]!;
    const bass = BASS_PATTERN[inBar]!;
    tone(engine, out, at, { type: "sawtooth", frequency: midi(root + bass), decay: sixteenth * 1.6, peak: 0.07 });
    tone(engine, out, at, { type: "square", frequency: midi(root + bass - 12), decay: sixteenth * 1.4, peak: 0.05 });

    // Off beat chord stabs keep it moving without cluttering the effects.
    if (inBar === 2 || inBar === 6 || inBar === 10 || inBar === 14) {
      for (const note of MATCH_TRIADS[bar]!) {
        tone(engine, out, at, { type: "triangle", frequency: midi(note), decay: sixteenth * 1.8, peak: 0.03 });
      }
    }
  },
};

/** The match winner stinger: a rising D major arpeggio into a held chord. */
export function playFanfare(engine: AudioEngine, out: AudioNode): void {
  const at = engine.now + 0.05;
  const step = 0.13;
  [62, 66, 69, 74].forEach((note, i) => {
    tone(engine, out, at + i * step, { type: "sawtooth", frequency: midi(note), attack: 0.01, decay: 0.28, peak: 0.09 });
    tone(engine, out, at + i * step, { type: "square", frequency: midi(note), detune: 6, attack: 0.01, decay: 0.28, peak: 0.04 });
  });
  const held = at + 4 * step;
  for (const note of [62, 66, 69, 74, 78]) {
    tone(engine, out, held, { type: "sawtooth", frequency: midi(note), attack: 0.03, decay: 1.8, peak: 0.055 });
  }
  tone(engine, out, held, { type: "sine", frequency: midi(38), attack: 0.02, decay: 2, peak: 0.25 });
}
