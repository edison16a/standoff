import type { StageId } from "../engine/stages";
import { chords, melody, type Note } from "./score";
import type { LeadVoice } from "./synths";

/**
 * A tune: sixteen sixteenths a bar, one chord a bar, and a melody as long
 * as the chords. `style` picks the band that plays it: the soft lobby
 * band or the full battle band.
 */
export interface Tune {
  style: "lobby" | "battle";
  bpm: number;
  /** How late the odd sixteenths land, as a share of a sixteenth. */
  swing: number;
  /** Per bar: the bass root first, then the chord tones. */
  chords: number[][];
  /** One entry per sixteenth across all bars. The A half is the first eight bars, the B half the rest. */
  hook: (Note | null)[];
  lead: LeadVoice;
  /** Which sixteenths the bass plays, as semitones above the root. */
  bass: (number | null)[];
}

const _ = null;

/**
 * "Warm Up", for the lobby and the results: B flat major at 94,
 * an organ swelling under a mellow lead, a round bass and brushes. Warm
 * and easy, so it can loop for as long as people take to pick.
 */
const WARM_UP: Tune = {
  style: "lobby",
  bpm: 94,
  swing: 0.16,
  chords: chords([
    "A#1 A#3 D4 F4 A4", "G2 A#3 D4 F4 G4", "D#2 A#3 D4 D#4 G4", "F2 A3 C4 F4 A4",
    "A#1 A#3 D4 F4 A4", "D2 A3 C4 D4 F4", "D#2 A#3 D4 D#4 G4", "F2 A#3 C4 F4",
    "C2 A#3 C4 D#4 G4", "F2 A3 C4 F4 A4", "D2 A3 C4 D4 F4", "G2 A#3 D4 F4 G4",
    "D#2 A#3 D4 D#4 G4", "F2 A3 C4 F4 A4", "G2 A#3 D4 F4 G4", "F2 A3 C4 D#4 F4",
  ]),
  hook: melody(`
    -:2 F5:2 D5:2 F5:2 A5:6 G5:2 | F5:8 D5:4 -:4 | -:2 G5:2 F5:2 D5:2 A#4:4 C5:4 | C5:12 -:4
    -:2 F5:2 D5:2 F5:2 A5:4 C6:4 | A5:8 G5:4 F5:4 | G5:6 F5:2 D#5:4 D5:4 | C5:8 -:8
    D#5:4 G5:4 A#5:6 G5:2 | A5:8 F5:4 C5:4 | D5:4 F5:4 A5:6 C6:2 | A#5:8 A5:4 G5:4
    G5:4 A#5:4 D6:8 | C6:6 A5:2 F5:8 | G5:4 F5:4 D5:4 C5:4 | D#5:4 D5:4 C5:8
  `),
  lead: "mellow",
  bass: [0, _, _, _, _, _, _, 7, _, _, 12, _, _, _, 7, _],
};

/**
 * "Clash", the battle theme: E minor at 152. Four on the floor with
 * sixteenth hats, a pumping octave bass and chugging guitar. The A half
 * is a punchy riff that climbs, the B half soars on long notes.
 */
const CLASH: Tune = {
  style: "battle",
  bpm: 152,
  swing: 0,
  chords: chords([
    "E2 G3 B3 E4", "C2 G3 C4 E4", "G2 G3 B3 D4", "D2 F#3 A3 D4",
    "E2 G3 B3 E4", "C2 G3 C4 E4", "A2 A3 C4 E4", "B1 F#3 B3 D#4",
    "C2 G3 C4 E4", "D2 F#3 A3 D4", "B1 F#3 B3 D4", "E2 G3 B3 E4",
    "C2 G3 C4 E4", "D2 F#3 A3 D4", "B1 F#3 B3 D#4", "B1 F#3 A3 D#4",
  ]),
  hook: melody(`
    E5:2 E5:1 G5:2 E5:1 B5:4 A5:2 G5:2 F#5:2 | G5:3 E5:3 C5:2 E5:4 -:4 | D5:2 D5:1 G5:2 D5:1 B5:4 A5:2 G5:2 A5:2 | F#5:6 D5:2 A4:4 -:4
    E5:2 E5:1 G5:2 E5:1 B5:4 A5:2 G5:2 F#5:2 | G5:3 A5:3 B5:2 C6:4 B5:2 A5:2 | A5:3 G5:3 E5:2 C5:2 E5:2 A5:2 G5:2 | F#5:8 D#5:4 B4:4
    G5:4 E5:4 G5:2 C6:6 | A5:4 F#5:4 A5:2 D6:6 | B5:3 A5:3 F#5:2 D5:4 F#5:4 | E5:10 -:2 B4:2 D5:2
    E5:2 G5:2 C6:4 B5:2 A5:2 G5:4 | F#5:2 A5:2 D6:4 C6:2 B5:2 A5:4 | B5:6 A5:2 G5:4 F#5:4 | D#5:4 F#5:4 B5:4 -:4
  `),
  lead: "guitar",
  bass: [0, _, 12, _, 0, _, 12, _, 0, _, 12, _, 0, 12, 7, _],
};

/** The battle theme per stage: the same song in the same key, voiced and paced for the place. */
const STAGE_VARIANTS: Record<StageId, Partial<Tune>> = {
  "dojo-rooftop": { lead: "guitar", bpm: 152 },
  "floating-temple": { lead: "wide", bpm: 150 },
  "crystal-cave": { lead: "square", bpm: 154 },
  "forest-treetop": { lead: "saw", bpm: 156 },
};

export const LOBBY_TUNE = WARM_UP;

export function battleTune(stage: StageId): Tune {
  return { ...CLASH, ...STAGE_VARIANTS[stage] };
}
