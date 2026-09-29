import type { AudioEngine } from "@/platform/audio/audio-engine";
import { keys, pad } from "./band";
import { hat, kick, pluck, riser, scratch, snare, sub, whistle } from "./crew";
import { bars, heldFor, hits, swung, type Song } from "./score";

/**
 * "Rail Yard Bounce": the run, a sunny hip hop beat in C major at 104
 * with a lazy swing. Sixteen bars: a marimba hook bounces over the A
 * section, a whistled tune floats over the B section, and each half ends
 * on a record scratch. A kick that knocks, a snare with a clap on it,
 * soft hats with a roll into each turn, a round sub bass and warm keys.
 */
const BPM = 104;
const SWING = 0.14;

const CHORDS = {
  C69: "C2 E3 A3 D4 G4",
  Am9: "A1 G3 C4 E4 B4",
  Fmaj9: "F1 A3 C4 E4 G4",
  G9sus: "G1 F3 A3 C4 D4",
  Dm9: "D2 F3 A3 C4 E4",
  Em7: "E2 G3 B3 D4",
};

const BARS = bars(CHORDS, [
  ["C69", "E5 . G5 E5 . C5 D5 ."],
  ["Am9", "E5 . . C5 . A4 C5 ."],
  ["Fmaj9", "F5 . A5 F5 . C5 E5 ."],
  ["G9sus", "D5 . . B4 . D5 G5 ."],
  ["C69", "E5 . G5 E5 . C5 D5 ."],
  ["Am9", "E5 . . G5 . A5 G5 ."],
  ["Dm9", "F5 . E5 D5 . C5 D5 ."],
  ["G9sus", "B4 . . . . . . ."],
  ["Fmaj9", "A5 . . . G5 . . ."],
  ["G9sus", "B5 . . . D6 . . ."],
  ["Em7", "B5 . . . G5 . . ."],
  ["Am9", "C6 . . . . . A5 ."],
  ["Fmaj9", "A5 . . . C6 . . ."],
  ["G9sus", "B5 . . . G5 . . ."],
  ["C69", "E6 . . . D6 . C6 ."],
  ["G9sus", "D6 . . . . . . ."],
]);

// Drums, a bar a row. The B section's kick is busier, so the song lifts without getting louder.
const KICK_A = hits("x......x..x.....");
const KICK_B = hits("x..x...x..x..x..");
const SNARE = hits("....x.......x...");
const GHOST = hits("..........x....x");
const HAT = hits("x.x.x.x.x.x.x.xx");
/** The sub bass, as [step, semitones over the root, sixteenths held]. */
const SUB_A = [[0, 0, 6], [7, 0, 2], [10, 12, 3], [14, 7, 2]] as const;
const SUB_B = [[0, 0, 3], [3, 0, 3], [7, 0, 2], [10, 12, 2], [13, 10, 3]] as const;

function play(engine: AudioEngine, out: AudioNode, step: number, at: number, sixteenth: number): void {
  const index = Math.floor(step / 16) % BARS.length;
  const bar = BARS[index]!;
  const inBar = step % 16;
  const time = swung(at, inBar, sixteenth, SWING);
  const [root, ...voicing] = bar.chord;
  const inB = index >= BARS.length / 2;
  // The last bar of each half drops the drums out under a scratch, then rushes into what comes next.
  const turn = index === 7 || index === 15;
  const fill = turn && inBar >= 12;

  if (!fill && (inB ? KICK_B : KICK_A).has(inBar)) kick(engine, out, time, 0.26);
  if (SNARE.has(inBar) && !fill) snare(engine, out, time, 0.2);
  if (GHOST.has(inBar) && index % 2 === 1 && !fill) snare(engine, out, time, 0.05);
  if (HAT.has(inBar) && !fill) hat(engine, out, time, inBar === 14 && inB, inBar % 4 === 0 ? 0.07 : 0.045);
  // A quick hat roll into every fourth bar.
  if (index % 4 === 3 && inBar >= 14 && !turn) hat(engine, out, time + sixteenth / 2, false, 0.035);
  if (turn && inBar === 12) scratch(engine, out, time, sixteenth * 3.5, 0.05);
  if (turn && inBar === 8) riser(engine, out, time, sixteenth * 8, 0.01);

  for (const [at16, shift, held] of inB ? SUB_B : SUB_A) {
    if (at16 === inBar && !fill) sub(engine, out, time, root! + 12 + shift, sixteenth * held, 0.17);
  }

  // Warm keys: the chord laid down on the one, then a short answer on the offbeat, over a soft pad.
  if (inBar === 0) keys(engine, out, time + 0.01, voicing, sixteenth * 10, inB ? 0.036 : 0.03);
  if (inBar === 6 || (inB && inBar === 11)) keys(engine, out, time, voicing.slice(-3), sixteenth * 2, 0.026);
  if (inBar === 0) pad(engine, out, time, voicing, sixteenth * 16, inB ? 0.009 : 0.005);

  if (inBar % 2 === 1) return;
  const note = bar.melody[inBar / 2];
  if (note === null || note === undefined) return;
  if (!inB) pluck(engine, out, time, note, 0.16);
  else whistle(engine, out, time, note, heldFor(bar.melody, inBar / 2) * sixteenth * 2 * 0.9, 0.045);
}

// Brighter than the lounge tune, so the hats shimmer through.
export const RUN_SONG: Song = { bpm: BPM, steps: BARS.length * 16, open: 7000, play };
