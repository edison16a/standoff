import type { AudioEngine } from "@/platform/audio/audio-engine";
import { noise } from "@/platform/audio/voices";
import type { Loop } from "./loop-music";
import { phrase } from "./phrase";
import { bass, hands, marimba, pad, panFlute } from "./tropic-band";

/**
 * "Hammock", the lobby tune: a slow island drift in A major at 76. Each
 * chord lasts two bars and the pads overlap, so the sound never stops
 * flowing. A pan flute hums a slow melody (A), then answers it higher
 * over new chords (B), with a soft marimba roll, a round bass, a hushed
 * conga and shaker, and a wave washing in every two bars. Sixteen bars.
 */

/** Amaj9, C#m7, Dmaj7, E9sus, then F#m9, Dmaj7, Bm9, E13sus. */
const CHORDS = [
  [45, 64, 68, 71, 73], [37, 61, 64, 68, 71], [38, 62, 66, 69, 73], [40, 62, 66, 69, 71],
  [42, 64, 68, 69, 73], [38, 62, 66, 69, 73], [35, 61, 62, 66, 69], [40, 61, 62, 66, 68],
];

const MELODY = phrase([
  [0, 76, 6], [6, 78, 2], [8, 81, 8], [16, 80, 4], [20, 78, 4], [24, 76, 8],
  [32, 73, 6], [38, 76, 2], [40, 78, 8], [48, 76, 12],
  [64, 74, 6], [70, 76, 2], [72, 78, 8], [80, 81, 4], [84, 78, 4], [88, 76, 8],
  [96, 71, 6], [102, 73, 2], [104, 76, 12],
]);

const ANSWER = phrase([
  [0, 81, 6], [6, 80, 2], [8, 78, 8], [16, 76, 8],
  [32, 78, 6], [38, 81, 2], [40, 85, 8], [48, 81, 8],
  [64, 78, 6], [70, 76, 2], [72, 74, 8], [80, 73, 8],
  [96, 71, 8], [104, 73, 4], [108, 76, 4], [112, 76, 12],
]);

const BPM = 76;
const SIXTEENTH = 60 / BPM / 4;
const BAR = SIXTEENTH * 16;

function play(engine: AudioEngine, out: AudioNode, step: number, at: number): void {
  const bar = Math.floor(step / 16);
  const inBar = step % 16;
  const inB = bar >= 8;
  const chord = CHORDS[Math.floor(bar / 2)]!;
  const tones = chord.slice(1);

  if (inBar === 0 && bar % 2 === 0) {
    pad(engine, out, at, tones, BAR * 2, 0.011, BAR);
    // A wave rolling up the sand and back.
    noise(engine, out, at, { filter: "lowpass", frequency: 500, sweepTo: 1400, attack: BAR * 0.7, decay: BAR * 0.9, peak: 0.03 });
  }
  if (inBar === 0) bass(engine, out, at, chord[0]!, BAR * 0.7, 0.16);
  if (inBar === 10) bass(engine, out, at, chord[0]! + 7, SIXTEENTH * 5, 0.09);
  // A slow, quiet marimba roll up the chord on the second beat, soft enough to shimmer rather than tick.
  if (inBar >= 4 && inBar < 4 + tones.length) marimba(engine, out, at, tones[inBar - 4]!, 0.014);

  if (inBar === 0 || inBar === 10) hands.kick(engine, out, at, 0.1);
  if (inBar === 6 || inBar === 14) hands.conga(engine, out, at, false, 0.03);
  if (inBar % 2 === 0) hands.shaker(engine, out, at, inBar % 4 === 2 ? 0.014 : 0.008);

  const line = inB ? ANSWER.get(step - 128) : MELODY.get(step);
  if (line) panFlute(engine, out, at, line.note, line.length * SIXTEENTH * 0.9, inB ? 0.045 : 0.05);
}

export const HAMMOCK: Loop = { bpm: BPM, steps: 256, swing: 0.18, play };
