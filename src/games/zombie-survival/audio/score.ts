import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { Loop } from "./loop-music";
import { bass, crackle, hat, keys, kick, lonelySynth, musicBox, pulse, snare } from "./score-band";

/**
 * The score, in C sharp minor to sit on the drone underneath. A music box
 * plays the hook over four bars (A), then a lonely synth answers over
 * darker chords that end on the major fifth (B), which pulls back to the
 * top. On the road it is a slow, half time walk; in a fight the arpeggio
 * doubles up and the kit fills in. The safehouse, in the lobby, is the
 * same song slower on an old electric piano with record crackle.
 */

/** Chord tones per bar, root first: C#m, A, E, B then F#m, A, C#m, G#. */
const CHORDS = [
  [37, 56, 61, 64], [33, 57, 61, 64], [40, 56, 59, 64], [35, 54, 59, 63],
  [42, 57, 61, 66], [33, 57, 61, 64], [37, 56, 61, 64], [44, 56, 60, 63],
];

const HOOK = new Map<number, number>([
  [0, 73], [2, 76], [4, 80], [6, 78], [8, 76], [12, 73],
  [16, 76], [20, 73], [24, 69], [28, 71],
  [32, 71], [34, 76], [36, 80], [38, 78], [40, 76], [44, 83],
  [48, 78], [52, 75], [56, 71], [60, 75],
]);

/** The synth's answer: step within B, note, length in sixteenths. */
const ANSWER = new Map<number, [number, number]>([
  [0, [81, 8]], [8, [78, 4]], [12, [76, 4]],
  [16, [76, 8]], [24, [73, 4]], [28, [69, 4]],
  [32, [73, 4]], [36, [76, 4]], [40, [80, 8]],
  [48, [80, 6]], [54, [75, 2]], [56, [72, 8]],
]);

/** Up and back down the chord, for the arpeggio. */
const ARP = [1, 2, 3, 2];

/** 0 on the road, 1 in a fight. */
export type Mood = () => number;

function roadStep(engine: AudioEngine, out: AudioNode, step: number, at: number, fight: boolean): void {
  const sixteenth = 60 / 92 / 4;
  const bar = Math.floor(step / 16);
  const inBar = step % 16;
  const chord = CHORDS[bar]!;

  if (inBar === 0 || inBar === 10 || (fight && inBar === 7)) kick(engine, out, at, fight ? 0.3 : 0.22);
  if (inBar === 8) snare(engine, out, at, fight ? 0.12 : 0.08);
  if (bar === 7 && inBar >= 12) snare(engine, out, at, 0.03 + (inBar - 12) * 0.02);
  if (fight ? true : inBar % 2 === 0) hat(engine, out, at, inBar % 4 === 2 ? 0.03 : 0.014);

  if (fight) {
    if (inBar % 2 === 0) bass(engine, out, at, chord[0]!, sixteenth * 1.6, 0.14);
  } else if (inBar === 0 || inBar === 8) {
    bass(engine, out, at, chord[0]!, sixteenth * 7, 0.15);
  }
  if (fight || inBar % 2 === 0) pulse(engine, out, at, chord[ARP[(fight ? inBar : inBar / 2) % 4]!]! + 12, fight ? 0.03 : 0.022);

  const inSection = step % 64;
  if (bar < 4) {
    const note = HOOK.get(inSection);
    if (note !== undefined) musicBox(engine, out, at, note, 0.06);
    return;
  }
  const answer = ANSWER.get(inSection);
  if (answer) lonelySynth(engine, out, at, answer[0] - 12, answer[1] * sixteenth, 0.045);
}

/** The play loop. `mood` is read every step, so a fight kicks in on the next sixteenth. */
export function lastLight(mood: Mood): Loop {
  return { bpm: 92, steps: 128, swing: 0.1, play: (engine, out, step, at) => roadStep(engine, out, step, at, mood() > 0.5) };
}

function safehouseStep(engine: AudioEngine, out: AudioNode, step: number, at: number): void {
  const sixteenth = 60 / 74 / 4;
  const bar = Math.floor(step / 16);
  const inBar = step % 16;
  const chord = CHORDS[bar]!;
  if (inBar === 0 || inBar === 11) kick(engine, out, at, 0.18);
  if (inBar === 8) snare(engine, out, at, 0.05);
  if (inBar % 4 === 2) hat(engine, out, at, 0.012);
  if (inBar === 0 || inBar === 10) keys(engine, out, at, chord.slice(1), sixteenth * 8, 0.03);
  if (inBar === 0) bass(engine, out, at, chord[0]!, sixteenth * 12, 0.16);
  if (Math.random() < 0.3) crackle(engine, out, at, 0.04);
  const inSection = step % 64;
  // The hook comes in only every other note here, so the lobby hums it rather than plays it.
  const note = bar < 4 && inSection % 4 === 0 ? HOOK.get(inSection) : undefined;
  if (note !== undefined) musicBox(engine, out, at, note, 0.045);
  const answer = bar >= 4 ? ANSWER.get(inSection) : undefined;
  if (answer) lonelySynth(engine, out, at, answer[0] - 12, answer[1] * sixteenth, 0.035);
}

export const SAFEHOUSE: Loop = { bpm: 74, steps: 128, swing: 0.2, play: safehouseStep };
