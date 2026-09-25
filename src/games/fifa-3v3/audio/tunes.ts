/**
 * The stadium's two tunes as step patterns, sixteen sixteenths a bar and
 * one chord a bar. Each runs eight bars: an A section with the hook
 * stated and answered, then a B section that lifts and turns back home.
 */
export interface Tune {
  bpm: number;
  groove: "bossa" | "afro";
  /** Per bar: the bass root first, then the chord tones, as MIDI notes. */
  chords: number[][];
  /** One entry per sixteenth across all bars, null for a rest. */
  hook: (number | null)[];
  lead: "marimba" | "pan";
  /** Which sixteenths the bass plays, as semitones above the root. */
  bass: (number | null)[];
  /** Sixteenths the guitar strums the chord on. */
  strums: number[];
  congas: number[];
}

const _ = null;

/**
 * "Beach Kickabout": the lobby. D major bossa at 108, a marimba hook over
 * nylon guitar, like a warm up on the sand before the match.
 */
const KICKABOUT: Tune = {
  bpm: 108,
  groove: "bossa",
  chords: [
    [38, 54, 57, 61, 64], // Dmaj9
    [35, 50, 54, 57, 61], // Bm9
    [40, 55, 59, 62, 66], // Em9
    [33, 55, 61, 66], // A13
    [43, 54, 57, 59, 62], // Gmaj9
    [42, 52, 57, 61, 64], // F#m7
    [40, 55, 59, 62, 66], // Em9
    [45, 55, 59, 62, 64], // A9sus
  ],
  hook: [
    78, _, _, 76, _, 74, _, _, _, _, 71, _, 74, _, _, _,
    76, _, _, 74, _, 71, _, _, 69, _, _, _, _, _, _, _,
    78, _, _, 76, _, 74, _, _, _, _, 71, _, 74, _, 76, _,
    78, _, _, _, 81, _, _, _, 79, _, _, _, _, _, _, _,
    83, _, _, 81, _, 78, _, _, 74, _, _, _, _, _, _, _,
    _, _, _, _, 81, _, _, 78, _, _, 76, _, 73, _, _, _,
    74, _, _, 76, _, 78, _, _, 79, _, _, 78, _, 76, _, _,
    74, _, _, _, _, _, _, _, 76, _, _, _, 69, _, 71, _,
  ],
  lead: "marimba",
  bass: [0, _, _, _, _, _, 7, _, 7, _, _, _, _, _, 0, _],
  strums: [2, 5, 8, 11, 14],
  congas: [7, 15],
};

/**
 * "Golden Hour": under the match. A minor afro house at 118, a steel pan
 * hook over a falling log drum bass, steady enough to play along to and
 * soft enough to leave the crowd on top.
 */
const GOLDEN_HOUR: Tune = {
  bpm: 118,
  groove: "afro",
  chords: [
    [33, 55, 59, 60, 64], // Am9
    [41, 55, 57, 60, 64], // Fmaj9
    [36, 55, 57, 62, 64], // C6/9
    [43, 55, 59, 62, 64], // G6
    [38, 53, 57, 60, 64], // Dm9
    [33, 55, 59, 60, 64], // Am9
    [41, 52, 57, 60, 64], // Fmaj7
    [40, 52, 56, 59, 62], // E7
  ],
  hook: [
    76, _, 76, _, 74, _, 72, _, 74, _, _, 76, _, _, _, _,
    72, _, 69, _, _, _, 67, _, 69, _, _, _, _, _, _, _,
    76, _, 76, _, 74, _, 72, _, 74, _, _, 76, _, _, 79, _,
    81, _, _, 79, _, 76, _, _, 74, _, _, _, _, _, _, _,
    _, _, _, _, 77, _, 76, _, 74, _, _, _, 72, _, _, _,
    _, _, _, _, 76, _, 74, _, 72, _, _, _, 69, _, _, _,
    _, _, _, _, 72, _, 74, _, 76, _, _, 79, _, _, 76, _,
    _, _, _, _, 80, _, _, _, 76, _, _, _, 74, _, 71, _,
  ],
  lead: "pan",
  bass: [0, _, _, 0, _, _, _, _, _, _, 12, _, 7, _, _, _],
  strums: [3, 6, 11],
  congas: [2, 6, 7, 10, 14],
};

export const TUNES = { lobby: KICKABOUT, play: GOLDEN_HOUR } as const;
export type TuneName = keyof typeof TUNES;
