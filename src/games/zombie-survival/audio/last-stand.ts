import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { Loop } from "./loop-music";
import { phrase } from "./phrase";
import { bass, glassBell, horns, kit, pulse, strings } from "./score-band";

/**
 * "Last Stand", the run's song, in F sharp minor at 118 so the C sharp
 * drone underneath is its fifth. A cold glass bell plays the hook over a
 * pulsing low synth and dark strings (A), then heroic horns climb over
 * brighter chords that end on the major fifth (B), which pulls back to
 * the top. On the road it pulses in eighths with a half time kit; in a
 * fight the pulse doubles to sixteenths, the kit drives on every beat,
 * toms roll into each phrase and the horns gain an octave. Sixteen bars.
 */

/** F#m, F#m, D, C#, F#m, F#m, Bm, C#, then D, E, F#m, A, Bm, D, C#sus, C#. */
const CHORDS = [
  [42, 54, 57, 61], [42, 54, 57, 61], [38, 54, 57, 62], [37, 53, 56, 61],
  [42, 54, 57, 61], [42, 54, 57, 61], [35, 54, 59, 62], [37, 53, 56, 61],
  [38, 54, 57, 62], [40, 56, 59, 64], [42, 54, 57, 61], [45, 57, 61, 64],
  [35, 54, 59, 62], [38, 54, 57, 62], [37, 54, 56, 61], [37, 53, 56, 61],
];

const HOOK = phrase([
  [0, 78, 4], [4, 73, 4], [8, 74, 4], [12, 73, 4],
  [16, 78, 4], [20, 73, 4], [24, 81, 6], [30, 80, 2],
  [32, 78, 4], [36, 74, 4], [40, 76, 4], [44, 78, 4],
  [48, 77, 8], [56, 80, 4], [60, 77, 4],
  [64, 78, 4], [68, 73, 4], [72, 74, 4], [76, 73, 4],
  [80, 78, 4], [84, 73, 4], [88, 85, 6], [94, 83, 2],
  [96, 81, 4], [100, 78, 4], [104, 83, 4], [108, 81, 4],
  [112, 80, 8], [120, 77, 4], [124, 73, 4],
]);

/** The horns' answer, rising where the hook sinks. */
const ANSWER = phrase([
  [0, 69, 4], [4, 74, 4], [8, 78, 8],
  [16, 76, 4], [20, 80, 4], [24, 83, 8],
  [32, 85, 12], [44, 81, 4],
  [48, 81, 4], [52, 76, 4], [56, 81, 8],
  [64, 83, 8], [72, 81, 4], [76, 78, 4],
  [80, 81, 8], [88, 78, 4], [92, 74, 4],
  [96, 78, 8], [104, 80, 8],
  [112, 85, 8], [120, 83, 4], [124, 80, 4],
]);

const BPM = 118;
const SIXTEENTH = 60 / BPM / 4;

/** 0 on the road, 1 in a fight. */
export type Mood = () => number;

function drums(engine: AudioEngine, out: AudioNode, bar: number, inBar: number, at: number, fight: boolean): void {
  const phraseEnd = bar % 4 === 3 && inBar >= 12;
  if (fight) {
    if (inBar % 4 === 0 || inBar === 7 || inBar === 14) kit.kick(engine, out, at, 0.24);
    if (inBar === 4 || inBar === 12) kit.snare(engine, out, at, 0.1);
    kit.hat(engine, out, at, inBar % 4 === 2 ? 0.026 : 0.012);
    if (phraseEnd) kit.tom(engine, out, at, 15 - inBar, 0.12);
    return;
  }
  if (inBar === 0 || inBar === 10) kit.kick(engine, out, at, 0.2);
  if (inBar === 8) kit.snare(engine, out, at, 0.07);
  if (inBar % 2 === 0) kit.hat(engine, out, at, inBar % 4 === 2 ? 0.016 : 0.009);
  // The last bar rolls on the toms in either mood, so the seam lands like a downbeat.
  if (bar === 15 && inBar >= 12) kit.tom(engine, out, at, 15 - inBar, 0.09);
}

function play(engine: AudioEngine, out: AudioNode, step: number, at: number, fight: boolean): void {
  const bar = Math.floor(step / 16);
  const inBar = step % 16;
  const inB = bar >= 8;
  const chord = CHORDS[bar]!;
  drums(engine, out, bar, inBar, at, fight);

  if (inBar === 0) {
    strings(engine, out, at, chord.slice(1), SIXTEENTH * 16, inB ? 0.05 : 0.04);
    bass(engine, out, at, chord[0]! - 12, SIXTEENTH * 14, 0.12);
  }
  // The pulse accents each beat, which is what makes it throb rather than drone.
  if (fight || inBar % 2 === 0) pulse(engine, out, at, chord[0]! + (inBar === 14 ? 12 : 0), SIXTEENTH * (fight ? 0.7 : 1.4), inBar % 4 === 0 ? 0.07 : 0.045);

  if (!inB) {
    const note = HOOK.get(step);
    if (note) glassBell(engine, out, at, note.note, 0.06);
    return;
  }
  const note = ANSWER.get(step - 128);
  if (!note) return;
  horns(engine, out, at, note.note - 12, note.length * SIXTEENTH * 0.92, fight ? 0.08 : 0.065);
  if (fight) horns(engine, out, at, note.note, note.length * SIXTEENTH * 0.92, 0.025);
}

/** The run's loop. `mood` is read every step, so a fight kicks in on the next sixteenth. */
export function lastStand(mood: Mood): Loop {
  return { bpm: BPM, steps: 256, swing: 0, play: (engine, out, step, at) => play(engine, out, step, at, mood() > 0.5) };
}
