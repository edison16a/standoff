import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { Loop } from "./loop-music";
import { phrase, thirdBelowInF } from "./phrase";
import { bass, hands, marimba, pad, steelDrum } from "./tropic-band";

/**
 * "Mango Tide", the round's song: a light calypso in F major at 104. The
 * steel drum plays the hook over marimba off beats for eight bars (A),
 * then the marimba answers in two mallet thirds over new chords while
 * the steel drum rolls softly underneath (B). Congas, claves on a son
 * clave and a shaker keep it bouncing, and a conga run carries the last
 * bar back to the top. Sixteen bars before it repeats.
 */

/** F, Bb, C, F, F, Bb, C7, F, then Dm7, Gm7, C, F, Bb, Am7, Gm7, C7. */
const CHORDS = [
  [41, 65, 69, 72], [46, 65, 70, 74], [48, 64, 67, 72], [41, 65, 69, 72],
  [41, 65, 69, 72], [46, 65, 70, 74], [48, 64, 67, 70], [41, 65, 69, 72],
  [38, 62, 65, 69], [43, 62, 65, 70], [48, 64, 67, 72], [41, 65, 69, 72],
  [46, 65, 70, 74], [45, 60, 64, 69], [43, 62, 65, 70], [48, 64, 67, 70],
];

const HOOK = phrase([
  [0, 72, 1], [2, 77, 2], [5, 77, 1], [6, 81, 3], [10, 79, 2], [12, 77, 4],
  [16, 74, 2], [18, 77, 2], [21, 79, 1], [22, 81, 2], [24, 79, 6],
  [32, 76, 1], [34, 79, 2], [37, 79, 1], [38, 84, 3], [42, 82, 2], [44, 79, 4],
  [48, 81, 6], [54, 79, 2], [56, 77, 8],
  [64, 72, 1], [66, 77, 2], [69, 77, 1], [70, 81, 3], [74, 79, 2], [76, 77, 4],
  [80, 74, 2], [82, 77, 2], [85, 82, 1], [86, 86, 4], [90, 84, 2], [92, 82, 4],
  [96, 84, 2], [98, 82, 2], [100, 79, 2], [102, 76, 2], [104, 79, 4], [108, 76, 2], [110, 72, 2],
  [112, 77, 8], [122, 76, 2], [124, 74, 4],
]);

const ANSWER = phrase([
  [0, 77, 3], [3, 74, 1], [4, 72, 2], [6, 69, 2], [8, 72, 4], [12, 74, 4],
  [16, 74, 3], [19, 70, 1], [20, 74, 2], [22, 77, 2], [24, 79, 8],
  [32, 76, 3], [35, 72, 1], [36, 76, 2], [38, 79, 2], [40, 84, 4], [44, 79, 4],
  [48, 81, 8], [56, 77, 4], [60, 72, 4],
  [64, 74, 3], [67, 77, 1], [68, 82, 2], [70, 81, 2], [72, 79, 4], [76, 77, 4],
  [80, 76, 3], [83, 72, 1], [84, 76, 2], [86, 79, 2], [88, 81, 8],
  [96, 82, 3], [99, 81, 1], [100, 79, 2], [102, 77, 2], [104, 74, 4], [108, 77, 4],
  [112, 76, 4], [116, 79, 2], [118, 82, 2], [120, 84, 4], [124, 79, 4],
]);

/** The calypso bass: [step, semitones over the root, length]. */
const BASS = phrase([[0, 0, 3], [3, 7, 1], [6, 0, 2], [8, 7, 3], [11, 12, 1], [12, 0, 2], [14, 7, 2]]);
/** A son clave across two bars, three hits then two. */
const CLAVE = [[0, 6, 12], [4, 8]];

const BPM = 104;
const SIXTEENTH = 60 / BPM / 4;

function percussion(engine: AudioEngine, out: AudioNode, bar: number, inBar: number, at: number): void {
  if (inBar === 0 || inBar === 8) hands.kick(engine, out, at, 0.2);
  if (CLAVE[bar % 2]!.includes(inBar)) hands.clave(engine, out, at, 0.022);
  if (bar === 15 && inBar >= 12) hands.conga(engine, out, at, inBar % 2 === 0, 0.05 + (inBar - 12) * 0.012);
  else if (inBar === 3 || inBar === 10 || inBar === 11) hands.conga(engine, out, at, true, inBar === 10 ? 0.06 : 0.04);
  else if (inBar === 6 || inBar === 14) hands.conga(engine, out, at, false, 0.07);
  hands.shaker(engine, out, at, inBar % 2 === 0 ? 0.024 : 0.013);
}

function play(engine: AudioEngine, out: AudioNode, step: number, at: number): void {
  const bar = Math.floor(step / 16);
  const inBar = step % 16;
  const inB = bar >= 8;
  const chord = CHORDS[bar]!;
  const tones = chord.slice(1);
  percussion(engine, out, bar, inBar, at);

  if (inBar === 0) pad(engine, out, at, tones, SIXTEENTH * 16, inB ? 0.009 : 0.007, SIXTEENTH * 8);
  const low = BASS.get(inBar);
  if (low) bass(engine, out, at, chord[0]! + low.note, low.length * SIXTEENTH * 1.2, 0.15);

  if (!inB) {
    // Marimba off beats, the bounce under the hook.
    if (inBar === 2 || inBar === 7 || inBar === 10) tones.forEach((note, i) => marimba(engine, out, at + i * 0.012, note, 0.028));
    const note = HOOK.get(step);
    if (note) steelDrum(engine, out, at, note.note, note.length * SIXTEENTH, 0.06);
    return;
  }
  // Under the answer the steel drum rolls the chord softly.
  if (inBar % 4 === 2) steelDrum(engine, out, at, tones[(inBar >> 2) % tones.length]! + 12, SIXTEENTH * 3, 0.018);
  const note = ANSWER.get(step - 128);
  if (!note) return;
  marimba(engine, out, at, note.note, 0.06);
  marimba(engine, out, at, thirdBelowInF(note.note), 0.035);
  // Long notes are rolled, the way a marimba player sustains one.
  for (let roll = 2; roll < note.length; roll += 2) marimba(engine, out, at + roll * SIXTEENTH, note.note, 0.03);
}

export const MANGO_TIDE: Loop = { bpm: BPM, steps: 256, swing: 0.12, play };
