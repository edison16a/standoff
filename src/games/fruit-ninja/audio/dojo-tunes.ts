import type { AudioEngine } from "@/platform/audio/audio-engine";
import { bass, block, drop, flute, koto, pad, shaker, taiko } from "./dojo-band";
import type { Loop } from "./loop-music";

/**
 * Fruit Slicer's music: a lo-fi dojo groove in G minor. The koto plays a
 * pentatonic hook over four bars (A), then the flute answers with long
 * notes over new chords (B). The round plays it at a nodding 90 beats a
 * minute with taiko and wood block; the lobby plays the same song slower
 * as a quiet garden, with only a shaker, the odd drop of water and pads.
 */

/** Chord tones per bar, as MIDI notes, root first. Gm7, Ebmaj7, Cm7, Dm7 then Cm7, Dm7, Ebmaj7, F. */
const CHORDS = [
  [43, 58, 62, 65], [39, 58, 62, 67], [36, 58, 63, 67], [38, 57, 60, 65],
  [36, 58, 63, 67], [38, 57, 60, 65], [39, 58, 62, 67], [41, 57, 60, 65],
];

type Line = Map<number, number>;
/** [step, note] pairs within one four bar section. */
const line = (notes: [number, number][]): Line => new Map(notes);

const HOOK = line([
  [0, 74], [3, 77], [6, 79], [8, 77], [10, 74], [12, 72],
  [16, 70], [19, 72], [22, 74], [26, 67],
  [32, 74], [35, 77], [38, 79], [40, 82], [42, 79], [44, 77],
  [48, 74], [52, 72], [54, 70], [56, 72], [60, 74],
]);

/** The flute's answer: [step, note, length in sixteenths]. */
const ANSWER: [number, number, number][] = [
  [0, 79, 7], [8, 77, 4], [12, 75, 4],
  [16, 74, 6], [22, 72, 4], [26, 69, 3], [29, 72, 3],
  [32, 70, 4], [36, 74, 4], [40, 79, 6], [46, 77, 2],
  [48, 77, 6], [54, 72, 2], [56, 74, 4], [60, 77, 4],
];
const ANSWER_AT = new Map(ANSWER.map(([step, note, length]) => [step, { note, length }]));

const BASS: Record<number, number> = { 0: 0, 6: 0, 10: 7, 14: 12 };

function dojoStep(engine: AudioEngine, out: AudioNode, step: number, at: number, bpm: number, calm: boolean): void {
  const sixteenth = 60 / bpm / 4;
  const bar = Math.floor(step / 16);
  const inBar = step % 16;
  const inB = bar >= 4;
  const chord = CHORDS[bar]!;

  if (inBar === 0) pad(engine, out, at, chord.slice(1), sixteenth * 16, calm ? 0.02 : 0.014);
  if (calm) {
    if (inBar === 0) taiko(engine, out, at, 0.16);
    if (inBar % 4 === 2) shaker(engine, out, at, 0.02);
    if (inBar === 0 || inBar === 8) bass(engine, out, at, chord[0]!, sixteenth * 7, 0.14);
    if (inBar === 11 && Math.random() < 0.35) drop(engine, out, at, 0.03);
  } else {
    if (inBar === 0 || inBar === 10 || (inBar === 7 && bar % 2 === 1)) taiko(engine, out, at, inBar === 7 ? 0.14 : 0.26);
    // The last bar tumbles back to the top on the taiko.
    if (bar === 7 && inBar >= 13) taiko(engine, out, at, 0.12 + (inBar - 13) * 0.04);
    if (inBar === 4 || inBar === 12) block(engine, out, at, 0.07);
    if (inBar % 2 === 0) shaker(engine, out, at, inBar % 4 === 2 ? 0.03 : 0.018);
    const b = BASS[inBar];
    if (b !== undefined) bass(engine, out, at, chord[0]! + b, sixteenth * 3, 0.16);
  }

  const inSection = step % 64;
  if (!inB) {
    const note = HOOK.get(inSection);
    if (note !== undefined) koto(engine, out, at, note, calm ? 0.05 : 0.065);
    return;
  }
  // Under the flute the koto keeps a quiet rolling pattern of the chord.
  if (inBar % 2 === 0 && !calm) koto(engine, out, at, chord[1 + ((inBar / 2) % 3)]! + 12, 0.022);
  const answer = ANSWER_AT.get(inSection);
  if (answer) flute(engine, out, at, answer.note, answer.length * sixteenth, calm ? 0.045 : 0.055);
}

export const DOJO: Loop = {
  bpm: 90,
  steps: 128,
  swing: 0.16,
  play: (engine, out, step, at) => dojoStep(engine, out, step, at, 90, false),
};

export const GARDEN: Loop = {
  bpm: 72,
  steps: 128,
  swing: 0.22,
  play: (engine, out, step, at) => dojoStep(engine, out, step, at, 72, true),
};
