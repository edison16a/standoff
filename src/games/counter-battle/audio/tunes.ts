import { chords, melody, type Note } from "./score";
import type { LeadVoice } from "./synths";

/**
 * A tune: sixteen sixteenths a bar, one chord a bar, and a melody as long
 * as the chords. `style` picks the band that plays it. The A half is the
 * first eight bars and the B half the last eight.
 */
export interface Tune {
  style: "lobby" | "match";
  bpm: number;
  /** How late the odd sixteenths land, as a share of a sixteenth. */
  swing: number;
  /** Semitones the whole tune is moved by. */
  key: number;
  /** Per bar: the bass root first, then the chord tones. */
  chords: number[][];
  /** One entry per sixteenth across all bars. */
  hook: (Note | null)[];
  lead: LeadVoice;
}

/**
 * "Kit Up", for the lobby and the results: A minor at 76. A slow dark
 * pad, a deep held bass, vibes carrying the tune and a brushed half time
 * groove. Calm before the round, while people pick their guns.
 */
const KIT_UP: Tune = {
  style: "lobby",
  bpm: 76,
  swing: 0.2,
  key: 0,
  chords: chords([
    "A1 C4 E4 G4 B4", "F2 C4 E4 F4 A4", "C2 B3 E4 G4", "E2 B3 D4 G4",
    "A1 C4 E4 G4 B4", "F2 C4 E4 F4 A4", "D2 C4 E4 F4 A4", "E2 B3 D4 E4 A4",
    "F2 C4 E4 F4 A4", "G2 B3 D4 E4 G4", "E2 B3 D4 G4", "A1 C4 E4 G4 B4",
    "D2 C4 E4 F4 A4", "F2 C4 E4 F4 A4", "B1 A3 D4 F4", "E2 G#3 B3 D4 E4",
  ]),
  hook: melody(`
    E5:4 -:2 B4:2 C5:4 E5:4 | A5:8 G5:4 E5:4 | G5:4 -:2 E5:2 D5:4 E5:4 | B4:12 -:4
    E5:4 -:2 B4:2 C5:4 E5:4 | A5:6 C6:2 B5:4 A5:4 | F5:6 E5:2 D5:4 C5:4 | B4:8 -:8
    C5:4 F5:4 A5:8 | G5:4 E5:4 D5:8 | E5:4 G5:4 B5:6 A5:2 | A5:12 -:4
    A5:4 F5:4 E5:4 D5:4 | C5:4 E5:4 A5:8 | D5:6 F5:2 A5:8 | G#5:8 E5:4 D5:4
  `),
  lead: "vibes",
};

/**
 * "Standoff", the match theme: F minor at 124. A sixteenth pulse bass
 * drives under a dark pad, and a synth lead plays a clipped, stalking
 * hook in the A half, then climbs to long held notes in the B half.
 */
const STANDOFF: Tune = {
  style: "match",
  bpm: 124,
  swing: 0,
  key: 0,
  chords: chords([
    "F2 G#3 C4 F4", "F2 G#3 C4 F4", "C#2 G#3 C#4 F4", "D#2 G3 A#3 D#4",
    "F2 G#3 C4 F4", "F2 G#3 C4 F4", "A#1 A#3 C#4 F4", "C2 G3 C4 E4",
    "C#2 G#3 C#4 F4", "D#2 G3 A#3 D#4", "F2 G#3 C4 F4", "F2 G#3 C4 F4",
    "C#2 G#3 C#4 F4", "D#2 G3 A#3 D#4", "C2 G3 C4 E4", "C2 G3 A#3 E4",
  ]),
  hook: melody(`
    F5:3 F5:3 G#5:2 G5:3 F5:3 D#5:2 | C5:6 -:2 C5:2 D#5:2 F5:4 | G#5:3 G#5:3 A#5:2 G#5:3 F5:3 C#5:2 | D#5:8 -:4 A#4:4
    F5:3 F5:3 G#5:2 G5:3 F5:3 D#5:2 | C6:6 A#5:2 G#5:4 G5:4 | F5:3 C#5:3 A#4:2 C#5:4 F5:4 | E5:8 G5:4 C5:4
    C#6:8 C6:4 G#5:4 | A#5:8 G5:4 D#5:4 | C6:6 G#5:6 F5:4 | G5:4 G#5:4 C6:8
    C#6:6 C6:2 A#5:4 G#5:4 | G5:6 G#5:2 A#5:8 | C6:4 A#5:4 G5:4 E5:4 | G5:8 E5:4 C5:4
  `),
  lead: "dark",
};

export const LOBBY_TUNE = KIT_UP;
export const MATCH_TUNE = STANDOFF;

/** The same theme for a match point: a semitone up, a touch faster and in brass, so everyone hears it matters. */
export const FINAL_TUNE: Tune = { ...STANDOFF, key: 1, bpm: 130, lead: "brass" };
