export type LeadVoice = "stab" | "pluck" | "brass";

/**
 * A tune as step patterns: sixteen sixteenths a bar, one chord a bar,
 * eight bars that loop. Notes are MIDI numbers before `key` shifts them.
 */
export interface Tune {
  bpm: number;
  /** How late the odd sixteenths land, as a share of a sixteenth. */
  swing: number;
  /** Semitones the whole tune is moved by. */
  key: number;
  /** Per bar: the bass root first, then the chord tones. */
  chords: number[][];
  /** One entry per sixteenth across all bars, null for a rest. */
  hook: (number | null)[];
  lead: LeadVoice;
  /** Which sixteenths the bass plays, as semitones above the root. */
  bass: (number | null)[];
  kick: number[];
  /** Snare hits in a bar, as sixteenths. */
  snare: number[];
  /** A ticking sixteenth pulse of the chord, for tension. */
  pulse: boolean;
}

const _ = null;

/**
 * "Kit Up", for the lobby and the results: E minor at 100, a laid back
 * half time groove with a plucked riff, while people pick their guns.
 */
const KIT_UP: Tune = {
  bpm: 100,
  swing: 0.14,
  key: 0,
  chords: [
    [40, 64, 67, 71], // Em
    [36, 64, 67, 72], // C
    [43, 62, 67, 71], // G
    [38, 62, 66, 69], // D
    [40, 64, 67, 71],
    [36, 64, 67, 72],
    [45, 64, 69, 72], // Am
    [47, 63, 66, 71], // B
  ],
  hook: [
    76, _, _, 74, _, 71, _, _, 74, _, _, _, 71, _, 69, _,
    67, _, _, _, 64, _, _, _, 67, _, 69, _, _, _, _, _,
    71, _, _, 74, _, 71, _, _, 79, _, _, 78, _, 76, _, _,
    74, _, _, _, 69, _, _, _, 66, _, _, _, _, _, _, _,
    76, _, _, 74, _, 71, _, _, 74, _, _, _, 71, _, 69, _,
    67, _, _, _, 72, _, _, _, 76, _, 79, _, _, _, _, _,
    81, _, _, 79, _, 76, _, _, 72, _, _, _, 76, _, _, _,
    75, _, _, _, 71, _, _, _, 78, _, _, _, 75, _, _, _,
  ],
  lead: "pluck",
  bass: [0, _, _, 0, _, _, 12, _, _, _, 7, _, _, _, 10, _],
  kick: [0, 7, 10],
  snare: [8],
  pulse: false,
};

/**
 * "Standoff", the match theme: D minor at 132, a pulsing sixteenth bass
 * under brassy stabs, and a hook that climbs to a held note and drops,
 * tense but catchy enough to hum between rounds.
 */
const STANDOFF: Tune = {
  bpm: 132,
  swing: 0,
  key: 0,
  chords: [
    [38, 62, 65, 69], // Dm
    [38, 62, 65, 69],
    [46, 62, 65, 70], // Bb
    [45, 61, 64, 69], // A
    [38, 62, 65, 69],
    [43, 62, 67, 70], // Gm
    [46, 62, 65, 70],
    [45, 61, 64, 67], // A7
  ],
  hook: [
    74, _, _, 74, _, _, 72, _, 74, _, _, 77, _, _, 76, _,
    74, _, _, _, _, _, _, _, 69, _, 72, _, 74, _, _, _,
    77, _, _, 77, _, _, 76, _, 74, _, _, 72, _, _, 70, _,
    69, _, _, _, _, _, 73, _, 76, _, _, _, 73, _, _, _,
    74, _, _, 74, _, _, 72, _, 74, _, _, 77, _, _, 79, _,
    81, _, _, _, _, _, 79, _, 77, _, _, 74, _, _, _, _,
    77, _, 76, _, 74, _, 72, _, 70, _, 69, _, 70, _, 72, _,
    73, _, _, _, _, _, _, _, 69, _, _, _, 73, _, 76, _,
  ],
  lead: "stab",
  bass: [0, 0, 12, 0, 0, 12, 0, 0, 0, 0, 12, 0, 0, 12, 7, 10],
  kick: [0, 6, 8, 14],
  snare: [4, 12],
  pulse: true,
};

export const LOBBY_TUNE = KIT_UP;
export const MATCH_TUNE = STANDOFF;

/** The same theme for a match point: up a tone, a touch faster and in brass, so everyone hears it matters. */
export const FINAL_TUNE: Tune = { ...STANDOFF, key: 2, bpm: 138, lead: "brass" };
