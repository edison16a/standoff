import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { Loop } from "./loop-music";
import { phrase } from "./phrase";
import { bass, horns, keys, kit, warmPad } from "./score-band";

/**
 * "Embers", the safehouse tune in the lobby: E major at 70, a warm room
 * before the run. Each chord lasts two bars and the pads overlap, so it
 * never stops flowing. A soft horn sings the melody (A) and answers it
 * higher over new chords (B), over a slow electric piano, a round bass,
 * a brushed kit and the crackle of an old record. Sixteen bars.
 */

/** Emaj9, C#m9, Amaj9, B6sus, then C#m9, Amaj9, F#m11, B6sus. */
const CHORDS = [
  [40, 63, 66, 68, 71], [37, 63, 64, 68, 71], [45, 61, 64, 68, 71], [47, 61, 64, 66, 68],
  [37, 63, 64, 68, 71], [45, 61, 64, 68, 71], [42, 61, 64, 69, 71], [47, 61, 64, 66, 68],
];

const MELODY = phrase([
  [0, 71, 6], [6, 73, 2], [8, 75, 8], [16, 76, 8], [24, 73, 8],
  [32, 76, 6], [38, 75, 2], [40, 73, 8], [48, 68, 12],
  [64, 69, 6], [70, 71, 2], [72, 73, 8], [80, 76, 4], [84, 75, 4], [88, 73, 8],
  [96, 71, 8], [104, 73, 4], [108, 76, 4], [112, 71, 12],
]);

const ANSWER = phrase([
  [0, 80, 6], [6, 78, 2], [8, 76, 8], [16, 75, 8],
  [32, 76, 6], [38, 78, 2], [40, 80, 8], [48, 76, 8],
  [64, 73, 6], [70, 76, 2], [72, 78, 8], [80, 81, 8],
  [96, 80, 8], [104, 78, 4], [108, 76, 4], [112, 78, 12],
]);

const BPM = 70;
const SIXTEENTH = 60 / BPM / 4;
const BAR = SIXTEENTH * 16;

function play(engine: AudioEngine, out: AudioNode, step: number, at: number): void {
  const bar = Math.floor(step / 16);
  const inBar = step % 16;
  const inB = bar >= 8;
  const chord = CHORDS[Math.floor(bar / 2)]!;
  const tones = chord.slice(1);

  if (inBar === 0 && bar % 2 === 0) warmPad(engine, out, at, tones, BAR * 2, 0.07);
  if (inBar === 0 || inBar === 10) keys(engine, out, at, tones, SIXTEENTH * (inBar === 0 ? 10 : 6), inBar === 0 ? 0.02 : 0.013);
  if (inBar === 0) bass(engine, out, at, chord[0]!, SIXTEENTH * 12, 0.16);
  if (inBar === 0 || inBar === 11) kit.kick(engine, out, at, 0.12);
  if (inBar === 8) kit.snare(engine, out, at, 0.025);
  if (inBar % 4 === 2) kit.hat(engine, out, at, 0.01);
  if (Math.random() < 0.3) kit.crackle(engine, out, at, 0.03);

  const line = inB ? ANSWER.get(step - 128) : MELODY.get(step);
  // Slow soft horns, a quiet promise of the heroics to come.
  if (line) horns(engine, out, at, line.note, line.length * SIXTEENTH * 0.9, inB ? 0.05 : 0.055);
}

export const SAFEHOUSE: Loop = { bpm: BPM, steps: 256, swing: 0.16, play };
