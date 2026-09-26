import type { AudioEngine } from "../../../platform/audio/audio-engine";
import { bass, brass, choir, cymbal, flute, frameDrum, harp, horn, rim, shaker, stringStab, strings, taiko } from "./instruments";

/**
 * The two music loops, written as step sequences. A track is told "step
 * n starts at time t" and schedules whatever plays there. Steps are
 * sixteenth notes and each chord lasts a bar.
 */
export interface Track {
  bpm: number;
  /** Steps before the pattern repeats. */
  length: number;
  play(engine: AudioEngine, out: AudioNode, step: number, at: number): void;
}

const _ = null;
type Line = (number | null)[];

/** How long a melody note rings: until the next note, or the end of its bar. */
function noteLength(line: Line, step: number, stepS: number): number {
  let n = 1;
  while (n < 8 && line[(step + n) % line.length] === null && (step + n) % 16 !== 0) n++;
  return n * stepS * 0.92;
}

/* Match, "Steel and Thunder": D minor at 132. Taiko and driving strings under a horn hook; the second half lifts with brass and choir. */

const BATTLE_CHORDS: [number, number, number][] = [
  [50, 57, 62], [50, 57, 62], [46, 53, 58], [48, 55, 60], [50, 57, 62], [50, 57, 62], [46, 53, 58], [45, 52, 57],
  [46, 53, 58], [48, 55, 60], [50, 57, 62], [50, 57, 62], [43, 50, 55], [45, 52, 57], [50, 57, 62], [45, 52, 57],
];
const HOOK: Line = [
  74, _, 69, _, 74, 76, 77, _, 76, _, 74, _, 72, _, 74, _,
  69, _, _, _, _, _, _, _, 74, _, 77, _, 81, _, 79, _,
  77, _, 77, _, 76, _, 74, _, 77, _, 76, _, 74, _, 72, _,
  72, _, 76, _, 79, _, 76, _, 72, _, _, _, _, _, _, _,
  74, _, 69, _, 74, 76, 77, _, 76, _, 74, _, 72, _, 74, _,
  81, _, _, _, 79, _, 77, _, 76, _, 77, _, 79, _, _, _,
  77, _, 74, _, 70, _, 74, _, 77, _, 79, _, 81, _, 82, _,
  81, _, _, _, _, _, _, _, 73, _, 76, _, 79, _, 81, _,
  82, _, _, _, 81, _, 79, _, 77, _, _, _, 74, _, _, _,
  79, _, _, _, 77, _, 76, _, 72, _, _, _, 76, _, _, _,
  77, _, _, _, 76, _, 74, _, 69, _, _, _, 74, _, 77, _,
  81, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _,
  79, _, _, _, 77, _, 79, _, 82, _, _, _, 79, _, _, _,
  81, _, _, _, 79, _, 77, _, 76, _, _, _, 73, _, _, _,
  74, _, 77, _, 81, _, 86, _, 84, _, 81, _, 77, _, 81, _,
  81, _, _, _, _, _, _, _, 76, _, 73, _, 69, _, 64, _,
];
/** The strings' eighths walk root, root, fifth, root, octave, fifth, third, fifth. */
const OSTINATO = [0, 0, 1, 0, 3, 1, 2, 1];

export const MATCH_TRACK: Track = {
  bpm: 132,
  length: 16 * 16,
  play(engine, out, step, at) {
    const bar = Math.floor(step / 16) % BATTLE_CHORDS.length;
    const inBar = step % 16;
    const lift = bar >= 8;
    const [root, fifth, octave] = BATTLE_CHORDS[bar]!;
    const beat = 60 / 132;
    const stepS = beat / 4;

    // Drums: taiko on the one, the and of two and three; the rim cracks the backbeat; a roll into each half.
    const roll = bar % 8 === 7 && inBar >= 12;
    if ([0, 6, 8].includes(inBar) || (lift && inBar === 11) || roll) taiko(engine, out, at, roll ? 0.3 + (inBar - 12) * 0.05 : 0.42);
    if (inBar === 4 || inBar === 12) rim(engine, out, at, 0.12);
    shaker(engine, out, at, inBar % 4 === 2 ? 0.05 : 0.025);
    if (bar % 8 === 7 && inBar === 8) cymbal(engine, out, at, 0.08, beat * 1.9);
    if (bar % 8 === 0 && inBar === 0) cymbal(engine, out, at, 0.1);

    if ([0, 3, 6, 8, 11, 14].includes(inBar)) bass(engine, out, at, root - 12, 0.2);
    if (inBar % 2 === 0) {
      const index = OSTINATO[inBar / 2]!;
      stringStab(engine, out, at, index === 3 ? root + 12 : [root, fifth, octave][index]!, 0.028);
    }
    // Brass: a stab on the one in the first half, long chords in the second, with the choir.
    if (!lift && inBar === 0) brass(engine, out, at, [fifth, octave, octave + 4 - (bar % 4 === 3 ? 0 : 1)], stepS * 3, 0.018);
    if (lift && inBar === 0 && bar % 2 === 0) {
      brass(engine, out, at, [fifth, octave], beat * 7.5, 0.016);
      choir(engine, out, at, [octave, octave + 7], beat * 8, 0.012);
    }
    if (lift && inBar === 0) strings(engine, out, at, [octave + 12], beat * 4, 0.01);

    const note = HOOK[step % HOOK.length];
    if (note !== null && note !== undefined) horn(engine, out, at, note, noteLength(HOOK, step, stepS), lift ? 0.05 : 0.042);
  },
};

/* Menu, "Before the Duel": D major at 96. A harp rippling under a wooden flute, a frame drum keeping easy time. */

const CAMP_CHORDS: [number, number, number][] = [
  [62, 66, 69], [60, 64, 67], [55, 59, 62], [62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64], [57, 61, 64],
];
const CAMP_TUNE: Line = [
  74, _, _, _, 76, _, 78, _, 81, _, _, _, 78, _, 76, _,
  76, _, _, _, 74, _, 72, _, 74, _, _, _, _, _, _, _,
  71, _, _, _, 74, _, 79, _, 78, _, 76, _, 74, _, _, _,
  74, _, _, _, _, _, _, _, 69, _, 71, _, 74, _, 76, _,
  78, _, _, _, 76, _, 74, _, 71, _, _, _, 74, _, _, _,
  79, _, _, _, 78, _, 76, _, 74, _, _, _, 71, _, _, _,
  73, _, _, _, 76, _, 81, _, 79, _, 78, _, 76, _, _, _,
  76, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _,
];
/** The harp ripples up and down the chord in sixteenths. */
const RIPPLE = [0, 1, 2, 3, 2, 1];

export const MENU_TRACK: Track = {
  bpm: 96,
  length: 16 * 8,
  play(engine, out, step, at) {
    const bar = Math.floor(step / 16) % CAMP_CHORDS.length;
    const inBar = step % 16;
    const chord = CAMP_CHORDS[bar]!;
    const beat = 60 / 96;
    const stepS = beat / 4;
    if (inBar === 0) strings(engine, out, at, chord.map((n) => n - 12), beat * 4.2, 0.009);
    if (inBar === 0 || inBar === 10) frameDrum(engine, out, at, 0.26);
    if (inBar === 6 || inBar === 14) frameDrum(engine, out, at, 0.08, true);
    if (inBar % 2 === 1) shaker(engine, out, at, 0.018);
    if (inBar === 0 || inBar === 8) bass(engine, out, at, chord[0] - 24, 0.14);
    if (inBar % 2 === 0) {
      const index = RIPPLE[(inBar / 2) % RIPPLE.length]!;
      harp(engine, out, at, index === 3 ? chord[0] + 12 : chord[index]!, 0.045);
    }
    const note = CAMP_TUNE[step % CAMP_TUNE.length];
    if (note !== null && note !== undefined) flute(engine, out, at, note, noteLength(CAMP_TUNE, step, stepS), 0.05);
  },
};
