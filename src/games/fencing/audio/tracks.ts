import type { AudioEngine } from "../../../platform/audio/audio-engine";
import { brush, castanets, harpsichord, kick, pizzicato, strings, tick } from "./ensemble";

/**
 * The two music loops, written as step sequences. A track is told "step
 * n starts at time t" and schedules whatever plays there. Steps are
 * sixteenth notes, one chord a bar, eight bars a loop: an A section with
 * the hook, then a B section that lifts and turns back home.
 */
export interface Track {
  bpm: number;
  /** Steps before the pattern repeats. */
  length: number;
  play(engine: AudioEngine, out: AudioNode, step: number, at: number): void;
}

const _ = null;
type Line = (number | null)[];

interface Chord {
  root: number;
  triad: [number, number, number];
}

const chord = (root: number, a: number, b: number, c: number): Chord => ({ root, triad: [a, b, c] });

/* Menu, "Salle d'Armes": La Folia in D minor at 78, a harpsichord tune over strings and brushes. */

const FOLIA = [
  chord(38, 57, 62, 65), chord(33, 57, 61, 64), chord(38, 57, 62, 65), chord(36, 55, 60, 64),
  chord(41, 57, 60, 65), chord(36, 55, 60, 64), chord(38, 57, 62, 65), chord(33, 57, 61, 64),
];
const FOLIA_TUNE: Line = [
  77, _, _, _, 76, _, 77, _, 81, _, _, _, _, _, _, _,
  76, _, _, _, 73, _, 76, _, 79, _, _, _, 76, _, _, _,
  77, _, _, _, 74, _, 77, _, 81, _, _, _, 79, _, 77, _,
  76, _, _, _, 72, _, _, _, _, _, _, _, _, _, _, _,
  81, _, _, _, 79, _, 77, _, 76, _, 77, _, _, _, _, _,
  79, _, _, _, 76, _, 72, _, 74, _, 76, _, _, _, _, _,
  77, _, _, _, 76, _, 74, _, 72, _, 74, _, _, _, 77, _,
  76, _, _, _, _, _, 73, _, _, _, 69, _, _, _, _, _,
];

export const MENU_TRACK: Track = {
  bpm: 78,
  length: 16 * 8,
  play(engine, out, step, at) {
    const bar = Math.floor(step / 16) % FOLIA.length;
    const inBar = step % 16;
    const { root, triad } = FOLIA[bar]!;
    const beat = 60 / 78;
    if (inBar === 0) strings(engine, out, at, triad, beat * 4.2, 0.011);
    // A walking pizzicato bass: root, fifth, octave, fifth.
    if (inBar % 4 === 0) pizzicato(engine, out, at, root + [0, 7, 12, 7][inBar / 4]!, 0.18);
    if (inBar === 0 || inBar === 10) kick(engine, out, at, 0.26);
    if (inBar === 4 || inBar === 12) brush(engine, out, at, 0.06);
    if (inBar % 2 === 0) tick(engine, out, at, inBar % 4 === 2 ? 0.02 : 0.01);
    const note = FOLIA_TUNE[step % FOLIA_TUNE.length];
    if (note !== null && note !== undefined) harpsichord(engine, out, at, note, 0.08);
  },
};

/* Match, "Riposte": an E minor Andalusian ground at 96, harpsichord ostinato over a trip hop beat. */

const GROUND = [
  chord(40, 59, 64, 67), chord(38, 57, 62, 66), chord(36, 55, 60, 64), chord(35, 54, 59, 63),
  chord(33, 57, 60, 64), chord(40, 59, 64, 67), chord(36, 55, 60, 64), chord(35, 54, 59, 63),
];
const RIPOSTE_TUNE: Line = [
  76, _, 79, _, 78, _, 76, _, _, _, 74, _, 76, _, _, _,
  74, _, 78, _, 76, _, 74, _, _, _, 72, _, 74, _, _, _,
  72, _, 76, _, 74, _, 72, _, _, _, 71, _, 72, _, _, _,
  71, _, _, _, 75, _, _, _, 78, _, _, _, _, _, _, _,
  _, _, _, _, _, _, _, _, 81, _, 79, _, 76, _, _, _,
  _, _, _, _, _, _, _, _, 79, _, 78, _, 76, _, _, _,
  _, _, _, _, _, _, _, _, 77, _, 76, _, 72, _, _, _,
  75, _, _, _, 78, _, _, _, 81, _, _, _, 75, _, _, _,
];
/** Which chord tone the harpsichord plays on each eighth; 3 is the top note an octave up. */
const OSTINATO = [0, 1, 2, 1, 3, 2, 1, 2];

export const MATCH_TRACK: Track = {
  bpm: 96,
  length: 16 * 8,
  play(engine, out, step, at) {
    const bar = Math.floor(step / 16) % GROUND.length;
    const inBar = step % 16;
    const inB = bar >= 4;
    const { root, triad } = GROUND[bar]!;
    const beat = 60 / 96;

    if (inBar === 0 || inBar === 10 || (bar % 4 === 3 && inBar === 7)) kick(engine, out, at, 0.3);
    if (inBar === 4 || inBar === 12) brush(engine, out, at, 0.09);
    if (inBar % 2 === 0) tick(engine, out, at, inBar % 4 === 2 ? 0.022 : 0.012);
    if ([6, 7, 14].includes(inBar) || (inB && inBar === 3)) castanets(engine, out, at, 0.05);

    if (inBar === 0 || inBar === 6 || inBar === 10) pizzicato(engine, out, at, root + (inBar === 6 ? 12 : 0), 0.2);
    if (inBar % 2 === 0) {
      const index = OSTINATO[inBar / 2]!;
      harpsichord(engine, out, at, index === 3 ? triad[0] + 12 : triad[index]!, 0.03);
    }
    if (inB && inBar === 0) strings(engine, out, at, triad, beat * 4.2, 0.01);

    const note = RIPOSTE_TUNE[step % RIPOSTE_TUNE.length];
    if (note !== null && note !== undefined) pizzicato(engine, out, at, note, 0.09);
  },
};
