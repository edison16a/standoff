import type { StageId } from "../engine/stages";

export type LeadVoice = "pluck" | "bell" | "crystal" | "flute";

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
  /** The kick on every fourth bar, to set up the turn. */
  kickFill: number[];
  /** A soft sixteenth arpeggio of the chord, for drive. */
  arp: boolean;
}

const _ = null;

/**
 * "Warm Up", for the lobby and the results: D major at 112, a bouncy
 * pluck melody over a clap groove. Friendly, so it can loop for a while.
 */
const WARM_UP: Tune = {
  bpm: 112,
  swing: 0.12,
  key: 0,
  chords: [
    [38, 62, 66, 69], // D
    [47, 62, 66, 71], // Bm
    [43, 62, 67, 71], // G
    [45, 61, 64, 69], // A
    [38, 62, 66, 69],
    [47, 62, 66, 71],
    [43, 62, 67, 71],
    [45, 61, 64, 69],
  ],
  hook: [
    74, _, _, 76, _, 78, _, _, 76, _, 74, _, _, _, 69, _,
    71, _, _, _, 74, _, _, _, 78, _, 76, _, 74, _, _, _,
    74, _, _, 76, _, 78, _, _, 81, _, 78, _, _, _, 76, _,
    76, _, _, _, 73, _, _, _, 69, _, _, _, _, _, _, _,
    78, _, 78, _, 76, _, 74, _, 76, _, _, _, 69, _, _, _,
    71, _, 74, _, 78, _, 74, _, 76, _, _, _, _, _, _, _,
    79, _, 78, _, 76, _, 74, _, 76, _, 78, _, 79, _, _, _,
    81, _, _, _, 76, _, _, _, 73, _, _, _, 76, _, _, _,
  ],
  lead: "pluck",
  bass: [0, _, _, 0, _, _, 7, _, 12, _, _, 0, _, 7, _, _],
  kick: [0, 6, 10],
  kickFill: [0, 6, 8, 10, 14],
  arp: false,
};

/**
 * "Clash", the battle theme: A minor at 144, four on the floor, a
 * pumping octave bass and a hook that climbs every time round. Each
 * stage plays it in its own key and voice.
 */
const CLASH: Tune = {
  bpm: 144,
  swing: 0,
  key: 0,
  chords: [
    [45, 57, 60, 64], // Am
    [41, 57, 60, 65], // F
    [48, 55, 60, 64], // C
    [43, 55, 59, 62], // G
    [45, 57, 60, 64],
    [41, 57, 60, 65],
    [43, 55, 59, 62],
    [40, 56, 59, 64], // E
  ],
  hook: [
    76, _, 76, _, 74, _, 76, _, 79, _, _, 76, _, 74, 72, _,
    72, _, _, 74, _, 72, 69, _, 72, _, 74, _, 76, _, _, _,
    76, _, 76, _, 74, _, 76, _, 79, _, _, 81, _, 79, 76, _,
    74, _, _, _, 71, _, 74, _, 79, _, _, _, _, _, _, _,
    81, _, 79, _, 76, _, 79, _, 81, _, _, 84, _, 81, 79, _,
    77, _, 76, _, 72, _, 76, _, 77, _, _, 79, _, 77, 76, _,
    74, _, 76, _, 79, _, 76, _, 74, _, 71, _, 74, _, 76, _,
    76, _, _, _, _, _, 71, _, 76, _, _, _, 80, _, _, _,
  ],
  lead: "pluck",
  bass: [0, _, 12, _, 0, _, 12, _, 0, _, 12, _, 0, _, 12, 7],
  kick: [0, 4, 8, 12],
  kickFill: [0, 4, 8, 10, 12, 14],
  arp: true,
};

/** The battle theme per stage: the same tune, moved and revoiced to suit the place. */
const STAGE_VARIANTS: Record<StageId, Partial<Tune>> = {
  "dojo-rooftop": { lead: "pluck", key: 0, bpm: 144 },
  "floating-temple": { lead: "bell", key: 2, bpm: 138 },
  "crystal-cave": { lead: "crystal", key: -3, bpm: 140 },
  "forest-treetop": { lead: "flute", key: -2, bpm: 146 },
};

export const LOBBY_TUNE = WARM_UP;

export function battleTune(stage: StageId): Tune {
  return { ...CLASH, ...STAGE_VARIANTS[stage] };
}
