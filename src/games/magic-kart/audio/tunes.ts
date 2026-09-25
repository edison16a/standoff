/**
 * The music, written as step patterns: sixteen sixteenth notes a bar,
 * one chord per bar. Every tune runs eight bars: an A section with the
 * hook, then a B section on new chords with a slower answer
 * line, so the loop has somewhere to go before it comes round again.
 * Each map has its own tempo, key and lead voice.
 */
export interface Tune {
  bpm: number;
  /** Chord tones per bar of the A section, as MIDI notes. The first is the bass root. */
  chords: number[][];
  /** The B section's four chords. */
  chordsB: number[][];
  /** The hook, one entry per sixteenth across the four A bars, null for a rest. */
  lead: (number | null)[];
  /** The B section's answer line across four bars. */
  leadB: (number | null)[];
  leadVoice: "steel" | "pluck" | "reed" | "bell";
  /** Which sixteenths the bass plays, and how many semitones above the root. */
  bass: (number | null)[];
  drums: "light" | "pop" | "drive" | "heavy";
  /** Plays chord tones as a rolling arpeggio instead of stabs. */
  arp: boolean;
}

const _ = null;

/** Builds a sparse line from [step, note] pairs, which reads far easier than sixty four slots. */
function line(bars: number, notes: [number, number][]): (number | null)[] {
  const steps: (number | null)[] = new Array<number | null>(bars * 16).fill(null);
  for (const [step, note] of notes) steps[step] = note;
  return steps;
}

export const TUNES: Record<"lobby" | "beach" | "space" | "city" | "volcano", Tune> = {
  lobby: {
    bpm: 100,
    chords: [[53, 65, 69, 72], [50, 62, 65, 69], [46, 62, 65, 70], [48, 64, 67, 70]],
    chordsB: [[46, 62, 65, 69], [45, 60, 64, 67], [43, 62, 65, 70], [48, 64, 67, 72]],
    lead: [81, _, _, 79, _, 77, _, _, 76, _, 77, _, 79, _, _, _, 74, _, _, 76, _, 77, _, _, 81, _, _, _, 79, _, _, _,
      77, _, _, 79, _, 81, _, _, 82, _, 81, _, 79, _, 77, _, 76, _, _, _, 72, _, _, _, 76, _, _, _, _, _, _, _],
    leadB: line(4, [[0, 74], [6, 77], [10, 81], [16, 79], [22, 76], [26, 72], [30, 74], [32, 74], [36, 77], [38, 79], [42, 77], [48, 79], [54, 76], [58, 72]]),
    leadVoice: "bell",
    bass: [0, _, _, _, _, _, 7, _, 0, _, _, _, 12, _, _, _],
    drums: "light",
    arp: true,
  },
  beach: {
    bpm: 124,
    chords: [[48, 64, 67, 72], [45, 64, 69, 72], [41, 65, 69, 72], [43, 62, 67, 71]],
    chordsB: [[41, 65, 69, 72], [43, 62, 67, 71], [45, 64, 69, 72], [43, 62, 65, 71]],
    lead: [79, _, 76, _, 79, _, 81, 79, _, 76, _, 72, _, 74, 76, _, 76, _, 72, _, 76, _, 79, _, 81, _, 79, _, 76, _, _, _,
      77, _, 76, _, 72, _, 69, _, 72, _, 77, 76, _, 72, _, _, 74, _, 71, _, 74, _, 79, _, 77, _, 74, _, 71, _, 67, _],
    leadB: line(4, [[0, 72], [3, 77], [6, 81], [8, 79], [10, 77], [12, 76], [16, 74], [19, 79], [22, 83], [26, 81], [28, 79],
      [32, 76], [35, 81], [38, 84], [40, 83], [42, 81], [44, 76], [48, 79], [52, 77], [56, 74], [60, 71], [62, 74]]),
    leadVoice: "steel",
    bass: [0, _, _, 0, _, _, 7, _, 0, _, _, 0, _, 7, _, 12],
    drums: "pop",
    arp: false,
  },
  space: {
    bpm: 112,
    chords: [[45, 60, 64, 69], [41, 60, 65, 69], [43, 62, 67, 71], [40, 59, 64, 68]],
    chordsB: [[38, 62, 65, 69], [45, 60, 64, 69], [41, 60, 65, 69], [40, 59, 64, 68]],
    lead: [76, _, _, _, 72, _, _, _, 74, _, 76, _, 79, _, _, _, 77, _, _, _, 76, _, _, _, 72, _, _, _, _, _, _, _,
      74, _, _, _, 79, _, _, _, 83, _, 81, _, 79, _, _, _, 80, _, _, _, 76, _, _, _, 71, _, 74, _, 76, _, _, _],
    leadB: line(4, [[0, 77], [6, 74], [10, 81], [16, 76], [22, 72], [26, 69], [30, 72], [32, 72], [36, 77], [40, 81], [44, 84], [48, 83], [54, 80], [58, 76], [62, 71]]),
    leadVoice: "reed",
    bass: [0, _, 0, _, 12, _, 0, _, 0, _, 0, _, 12, _, 7, _],
    drums: "drive",
    arp: true,
  },
  city: {
    bpm: 128,
    chords: [[40, 59, 64, 67], [36, 60, 64, 67], [43, 62, 67, 71], [38, 62, 66, 69]],
    chordsB: [[45, 60, 64, 69], [40, 59, 64, 67], [36, 60, 64, 67], [38, 62, 66, 69]],
    lead: [76, _, 76, _, 79, _, 76, _, 74, _, 71, _, 74, _, 76, _, 76, _, 76, _, 79, _, 81, _, 79, _, 76, _, 74, _, _, _,
      79, _, 79, _, 83, _, 79, _, 78, _, 74, _, 78, _, 79, _, 81, _, 78, _, 74, _, 69, _, 71, _, 74, _, 78, _, _, _],
    leadB: line(4, [[0, 76], [2, 76], [4, 72], [8, 69], [10, 72], [12, 76], [16, 79], [20, 76], [24, 71], [28, 74],
      [32, 72], [34, 72], [36, 76], [40, 79], [42, 84], [44, 83], [48, 81], [54, 78], [58, 74], [62, 81]]),
    leadVoice: "pluck",
    bass: [0, 0, 12, 0, 0, 12, 0, 7, 0, 0, 12, 0, 0, 12, 7, 12],
    drums: "drive",
    arp: false,
  },
  volcano: {
    bpm: 134,
    chords: [[38, 62, 65, 69], [39, 63, 67, 70], [38, 62, 65, 69], [36, 60, 64, 67]],
    chordsB: [[46, 62, 65, 70], [48, 64, 67, 72], [38, 62, 65, 69], [45, 61, 64, 69]],
    lead: [74, _, _, 74, 75, _, 74, _, 72, _, 69, _, 70, _, 69, _, 67, _, _, _, 69, _, 70, _, 69, _, _, _, _, _, _, _,
      74, _, _, 74, 77, _, 75, _, 74, _, 72, _, 70, _, 72, _, 74, _, 70, _, 69, _, 67, _, 69, _, _, _, 62, _, _, _],
    leadB: line(4, [[0, 74], [3, 77], [6, 82], [10, 81], [12, 77], [16, 76], [19, 79], [22, 84], [26, 82], [28, 79],
      [32, 81], [36, 77], [40, 74], [44, 77], [48, 76], [54, 73], [58, 69], [62, 73]]),
    leadVoice: "reed",
    bass: [0, _, 0, 0, _, 0, 12, _, 0, _, 0, 0, _, 1, 0, _],
    drums: "heavy",
    arp: false,
  },
};

/** Eight bars of sixteenths: the whole loop. */
export const TUNE_STEPS = 8 * 16;
