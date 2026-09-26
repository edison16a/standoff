import type { AudioEngine } from "../../../platform/audio/audio-engine";
import { bass, brass, choir, cymbal, horn, koto, rim, shaker, stringStab, strings, taiko } from "./instruments";

/**
 * The music loops, written as step sequences. A track is told "step
 * n starts at time t" and schedules whatever plays there. Steps are
 * sixteenth notes and each chord lasts a bar.
 */
export interface Track {
  bpm: number;
  /** How loud the track plays into the music bus, so every track sits at the same level. */
  level: number;
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

/* Match, "Steel and Thunder": B minor at 132. Taiko and driving strings under a horn hook doubled by a koto; the second half lifts with brass and choir. */

/**
 * The theme is written in D minor and played three semitones down in B
 * minor, so no other game's song shares its key and tempo.
 */
export const BATTLE_KEY = -3;

const BATTLE_CHORDS = ([
  [50, 57, 62], [50, 57, 62], [46, 53, 58], [48, 55, 60], [50, 57, 62], [50, 57, 62], [46, 53, 58], [45, 52, 57],
  [46, 53, 58], [48, 55, 60], [50, 57, 62], [50, 57, 62], [43, 50, 55], [45, 52, 57], [50, 57, 62], [45, 52, 57],
] as [number, number, number][]).map((chord) => chord.map((n) => n + BATTLE_KEY) as [number, number, number]);
const HOOK: Line = ([
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
] as Line).map((n) => (n === null ? null : n + BATTLE_KEY));
/** The strings' eighths walk root, root, fifth, root, octave, fifth, third, fifth. */
const OSTINATO = [0, 0, 1, 0, 3, 1, 2, 1];

export const MATCH_TRACK: Track = {
  bpm: 132,
  level: 0.42,
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
    if (note === null || note === undefined) return;
    horn(engine, out, at, note, noteLength(HOOK, step, stepS), lift ? 0.05 : 0.042);
    // In the first half a koto plucks along with the horn, which gives the hook its edge and its place.
    if (!lift) koto(engine, out, at, note, 0.028);
  },
};

