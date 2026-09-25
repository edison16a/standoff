/**
 * The arena's two tunes as step patterns, sixteen sixteenths a bar and
 * one chord a bar. Each runs eight bars: an A section with the hook
 * stated and answered, then a B section that lifts and turns back home.
 */
export interface Tune {
  bpm: number;
  /** How late the odd sixteenths land, as a share of a sixteenth. */
  swing: number;
  /** Per bar: the bass root first, then the chord tones, as MIDI notes. */
  chords: number[][];
  /** One entry per sixteenth across all bars, null for a rest. */
  hook: (number | null)[];
  lead: "vibes" | "flute";
  /** Which sixteenths the bass plays, as semitones above the root. */
  bass: (number | null)[];
  kick: number[];
  /** The kick pattern on every fourth bar, to set up the turn. */
  kickFill: number[];
  /** Sixteenths the electric piano plays the chord on. */
  keyHits: number[];
  /** Adds a hand clap to the snare, for the livelier tune. */
  clap: boolean;
}

const _ = null;

/**
 * "Blacktop": the lobby and results. G minor at 90, late night streetball,
 * a vibraphone hook over rolled ninth chords.
 */
const BLACKTOP: Tune = {
  bpm: 90,
  swing: 0.22,
  chords: [
    [43, 58, 62, 65, 69], // Gm9
    [39, 55, 58, 62, 65], // Ebmaj9
    [36, 51, 55, 58, 62], // Cm9
    [38, 54, 60, 65], // D7#9
    [46, 50, 53, 57, 60], // Bbmaj9
    [45, 55, 60, 63, 67], // Am7b5
    [39, 51, 55, 58, 62], // Ebmaj7
    [38, 54, 57, 60, 62], // D7
  ],
  hook: [
    74, _, _, 72, _, 70, _, _, 67, _, _, _, 70, _, 72, _,
    74, _, _, _, 77, _, 74, _, 72, _, _, _, _, _, _, _,
    74, _, _, 72, _, 70, _, _, 67, _, _, _, 65, _, 62, _,
    66, _, _, _, _, _, _, _, 69, _, _, _, _, _, _, _,
    77, _, _, 74, _, _, 69, _, _, _, 72, _, 74, _, _, _,
    75, _, _, 72, _, _, 67, _, _, _, _, _, _, _, _, _,
    74, _, _, 70, _, _, 67, _, _, _, 70, _, 74, _, 79, _,
    78, _, _, _, 74, _, _, _, 72, _, _, _, 66, _, 69, _,
  ],
  lead: "vibes",
  bass: [0, _, _, _, _, _, 0, _, _, _, 7, _, _, 10, _, _],
  kick: [0, 7, 10],
  kickFill: [0, 3, 7, 10, 11],
  keyHits: [0, 6, 11],
  clap: false,
};

/**
 * "Tip Off": under the game itself. F minor at 100, a bouncier groove
 * with claps and a soft synth flute, sparse enough to leave room for the
 * crowd and the ball.
 */
const TIP_OFF: Tune = {
  bpm: 100,
  swing: 0.14,
  chords: [
    [41, 56, 60, 63, 67], // Fm9
    [37, 53, 56, 60, 63], // Dbmaj9
    [46, 53, 56, 60, 61], // Bbm9
    [36, 52, 55, 58, 62], // C9
    [44, 55, 60, 63, 67], // Abmaj7
    [42, 53, 58, 61, 65], // Gbmaj7
    [39, 55, 58, 61, 63], // Eb7
    [36, 53, 55, 58, 60], // C7sus
  ],
  hook: [
    72, _, 72, _, 75, _, 72, _, 70, _, 68, _, 65, _, _, _,
    68, _, _, 70, _, _, 72, _, _, _, _, _, _, _, _, _,
    72, _, 72, _, 75, _, 72, _, 70, _, 68, _, 65, _, _, _,
    67, _, _, _, 64, _, _, _, _, _, _, _, _, _, _, _,
    _, _, _, _, _, _, _, _, 77, _, 75, _, 72, _, _, _,
    _, _, _, _, _, _, _, _, 77, _, 75, _, 73, _, _, _,
    _, _, _, _, _, _, _, _, 75, _, 73, _, 70, _, _, _,
    72, _, _, _, _, _, _, _, 70, _, 67, _, 65, _, _, _,
  ],
  lead: "flute",
  bass: [0, _, _, 0, _, _, 12, _, _, _, 7, _, 10, _, 12, _],
  kick: [0, 6, 10],
  kickFill: [0, 6, 8, 10, 14],
  keyHits: [2, 7, 10],
  clap: true,
};

export const TUNES = { lobby: BLACKTOP, play: TIP_OFF } as const;
export type TuneName = keyof typeof TUNES;
