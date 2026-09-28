import type { AudioEngine } from "@/platform/audio/audio-engine";
import { bass, clap, clav, hat, kick, rise, stab, strings } from "./disco";
import { bars, heldFor, type Song } from "./score";

/**
 * "Last Train Boogie": the run, retro disco in A minor at 122. Sixteen
 * bars: the strings sing the hook over the A section, then in the B
 * section they hold a lush chord bed and answer higher while the clav
 * gets busier. Four on the floor, open hats on the offbeats, handclaps
 * on two and four, and an octave bass that never sits still.
 */
const BPM = 122;

const CHORDS = {
  Am9: "A1 G3 C4 E4 B4",
  D9: "D2 F#3 A3 C4 E4",
  Fmaj7: "F1 A3 C4 E4",
  G6: "G1 B3 D4 E4",
  Em7: "E2 G3 B3 D4",
  E7: "E2 G#3 B3 D4",
  Dm9: "D2 F3 A3 C4 E4",
  G9: "G1 F3 A3 B3 D4",
};

const BARS = bars(CHORDS, [
  ["Am9", "E5 . E5 . G5 . A5 ."],
  ["D9", ". . A5 . G5 . E5 ."],
  ["Am9", "E5 . E5 . G5 . A5 ."],
  ["D9", "C6 . B5 . A5 . F#5 ."],
  ["Fmaj7", "A5 . . G5 . . E5 ."],
  ["G6", "D5 . E5 . G5 . . ."],
  ["Em7", "B5 . . A5 . . G5 ."],
  ["E7", "G#5 . . . B5 . . ."],
  ["Fmaj7", "C6 . . . A5 . . ."],
  ["G6", "B5 . . . G5 . . ."],
  ["Em7", "E5 . G5 . B5 . D6 ."],
  ["Am9", "C6 . . . . . . ."],
  ["Dm9", "A5 . . . F5 . . ."],
  ["G9", "B5 . . A5 . . G5 ."],
  ["Fmaj7", "A5 . . . C6 . . ."],
  ["E7", "B5 . . G#5 . . E5 ."],
]);

const _ = null;
/** Low on the beat, high on the and: the octave bounce, with a pickup into the next bar. */
const BASS = [0, _, 12, _, 0, _, 12, _, 0, _, 12, _, 0, 12, _, 12];
const BASS_B = [0, _, 12, _, 0, _, 12, 12, 0, _, 12, _, 7, _, 12, 10];
const CLAV = new Set([3, 6, 11, 14]);
const CLAV_B = new Set([2, 3, 6, 10, 11, 14]);

function play(engine: AudioEngine, out: AudioNode, step: number, at: number, sixteenth: number): void {
  const index = Math.floor(step / 16) % BARS.length;
  const bar = BARS[index]!;
  const inBar = step % 16;
  const [root, ...voicing] = bar.chord;
  const inB = index >= BARS.length / 2;
  // The last bar of each half drops its final kick and sweeps up into what comes next.
  const turn = index === 7 || index === 15;

  if (inBar % 4 === 0 && !(turn && inBar === 12)) kick(engine, out, at, 0.26);
  if (inBar === 4 || inBar === 12) clap(engine, out, at, 0.085);
  if (turn && (inBar === 13 || inBar === 14 || inBar === 15)) clap(engine, out, at, 0.03 + 0.012 * (inBar - 13));
  if (inBar % 4 === 2) hat(engine, out, at, true, 0.034);
  else hat(engine, out, at, false, inBar % 2 === 0 ? 0.02 : 0.012);
  if (turn && inBar === 8) rise(engine, out, at, root! + 36, sixteenth * 8, 0.012);

  const offset = (inB ? BASS_B : BASS)[inBar];
  if (offset !== null && offset !== undefined) bass(engine, out, at, root! + 12 + offset, sixteenth * 1.7, offset === 0 ? 0.034 : 0.028);

  if ((inB ? CLAV_B : CLAV).has(inBar)) clav(engine, out, at, voicing.slice(-3), 0.018);
  if (!inB && inBar === 14 && index % 2 === 1) stab(engine, out, at, voicing.slice(-3).map((n) => n + 12), sixteenth * 1.5, 0.012);
  // A held string chord under every bar, fuller in the B section, so the groove never goes thin.
  if (inBar === 0) stab(engine, out, at, voicing, sixteenth * 14, inB ? 0.007 : 0.0045);
  if (inB && (inBar === 6 || inBar === 10)) stab(engine, out, at, voicing.slice(-3).map((n) => n + 12), sixteenth, 0.01);

  if (inBar % 2 === 1) return;
  const note = bar.melody[inBar / 2];
  if (note === null || note === undefined) return;
  const length = heldFor(bar.melody, inBar / 2) * sixteenth * 2 * 0.85;
  strings(engine, out, at, note, length, inB ? 0.02 : 0.024);
}

export const RUN_SONG: Song = { bpm: BPM, steps: BARS.length * 16, play };
