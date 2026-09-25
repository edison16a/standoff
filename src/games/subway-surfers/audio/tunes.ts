/**
 * The music as step patterns: sixteen sixteenths a bar, one chord a bar.
 * Each tune is a form of sections played in order and looped. The run
 * tune is a chill funk and hip hop groove in G minor with a whistled
 * hook over the A sections and vibes answering over the B. The menu
 * tune is the same band laid back in B flat.
 */

export type Groove = "full" | "half" | "light";
export type LeadVoice = "whistle" | "vibes";

export interface Section {
  /** One chord per bar, as MIDI notes. The first is the bass note, the rest the voicing. */
  chords: number[][];
  /** The melody, one entry per sixteenth across the whole section, null for a rest. */
  lead: (number | null)[];
  leadVoice: LeadVoice;
  /** Which sixteenths of a bar the bass plays, in semitones above the chord's bass note. */
  bass: (number | null)[];
  groove: Groove;
  /** Guitar chops on the offbeats. */
  chops: boolean;
}

export interface Tune {
  bpm: number;
  /** How far the offbeat sixteenths are pushed late, as a share of a sixteenth. */
  swing: number;
  form: Section[];
}

const _ = null;

// The run tune's chords. Voicings sit between B flat 3 and A 4 so the hook has room above.
const Gm9 = [43, 58, 62, 65, 69];
const C9 = [48, 58, 62, 64, 67];
const Ebmaj7 = [39, 58, 62, 63, 67];
const Dm7 = [38, 57, 60, 62, 65];
const Cm9 = [36, 55, 58, 62, 63];
const D7 = [38, 54, 57, 60, 64];

/** The hook's first two bars, the catchy part, the same in both A sections. */
const HOOK = [
  74, _, _, 74, _, _, 72, _, 70, _, 72, _, 67, _, _, _,
  _, _, 70, _, 72, _, 74, _, 76, _, _, 74, _, _, _, _,
];

const RUN_BASS = [0, _, _, 0, _, _, 12, _, _, _, 0, _, 7, _, 10, _];
const RUN_BASS_B = [0, _, _, _, _, _, 7, _, 0, _, _, 0, _, _, 12, _];

const RUN_A1: Section = {
  chords: [Gm9, C9, Gm9, C9],
  lead: [...HOOK,
    74, _, _, 74, _, _, 72, _, 70, _, 72, _, 77, _, 74, _,
    _, _, 72, _, 70, _, 67, _, _, _, _, _, _, _, _, _],
  leadVoice: "whistle", bass: RUN_BASS, groove: "full", chops: true,
};

const RUN_A2: Section = {
  ...RUN_A1,
  chords: [Gm9, C9, Ebmaj7, D7],
  lead: [...HOOK,
    79, _, _, 77, _, _, 74, _, 70, _, _, 72, _, 74, _, _,
    72, _, _, 69, _, _, 66, _, 69, _, _, _, _, _, _, _],
};

const RUN_B1: Section = {
  chords: [Ebmaj7, Dm7, Cm9, D7],
  lead: [
    70, _, _, _, 74, _, _, _, 79, _, _, _, 77, _, 74, _,
    72, _, _, _, _, _, 69, _, _, _, 72, _, 74, _, _, _,
    70, _, _, _, 74, _, _, _, 75, _, _, _, 74, _, 72, _,
    69, _, _, _, _, _, 66, _, _, _, 69, _, 72, _, _, _],
  leadVoice: "vibes", bass: RUN_BASS_B, groove: "half", chops: false,
};

const RUN_B2: Section = {
  ...RUN_B1,
  groove: "full",
  chops: true,
  lead: [...RUN_B1.lead.slice(0, 48),
    74, _, 72, _, 69, _, 66, _, 69, _, 70, _, 72, _, 74, _],
};

// The menu tune's chords, a lazy two five in B flat.
const Ebmaj9 = [39, 55, 58, 62, 65];
const Dm7b = [38, 53, 57, 60, 64];
const Cm7 = [36, 51, 55, 58, 62];
const F13 = [41, 51, 55, 57, 62];
const Gm7 = [43, 53, 57, 58, 62];

const MENU_BASS = [0, _, _, _, _, _, _, 0, _, _, 7, _, _, _, _, _];

const MENU_A: Section = {
  chords: [Ebmaj9, Dm7b, Cm7, F13],
  lead: [
    77, _, _, 74, _, _, 70, _, _, _, 72, _, 74, _, _, _,
    _, _, _, _, 72, _, 69, _, _, _, _, _, _, _, _, _,
    75, _, _, 74, _, _, 70, _, _, _, 67, _, 70, _, _, _,
    _, _, _, _, 69, _, 72, _, _, _, _, _, _, _, _, _],
  leadVoice: "vibes", bass: MENU_BASS, groove: "light", chops: false,
};

const MENU_B: Section = {
  chords: [Gm7, Cm7, Ebmaj9, F13],
  lead: [
    74, _, _, _, _, _, 77, _, _, _, 74, _, _, _, _, _,
    72, _, _, _, _, _, 70, _, _, _, _, _, _, _, _, _,
    70, _, _, 72, _, _, 74, _, _, _, 77, _, _, _, 79, _,
    77, _, _, _, _, _, 74, _, _, _, 72, _, _, _, _, _],
  leadVoice: "whistle", bass: MENU_BASS, groove: "half", chops: true,
};

export const TUNES = {
  run: { bpm: 100, swing: 0.14, form: [RUN_A1, RUN_A2, RUN_B1, RUN_B2] },
  menu: { bpm: 86, swing: 0.2, form: [MENU_A, MENU_B] },
} satisfies Record<string, Tune>;

/** Sixteenths in one pass through a tune's form. */
export function loopSteps(tune: Tune): number {
  return tune.form.reduce((sum, section) => sum + section.chords.length * 16, 0);
}

/** Finds the section and step within it for a step of the whole loop. */
export function locate(tune: Tune, step: number): { section: Section; local: number; last: boolean } {
  let local = step % loopSteps(tune);
  for (const [i, section] of tune.form.entries()) {
    const length = section.chords.length * 16;
    if (local < length) return { section, local, last: i === tune.form.length - 1 };
    local -= length;
  }
  return { section: tune.form[0]!, local: 0, last: false };
}
