import type { AudioEngine } from "@/platform/audio/audio-engine";
import { horns, lowBrass, strings, trumpets } from "./brass";
import { drums } from "./drums";
import { bars, heldFor, type Song } from "./score";

/**
 * "Prime Time": under the game, a big brass and drums broadcast theme
 * in D major at 138, the kind a network runs into kickoff. Sixteen bars:
 * the trumpets blow the fanfare over the A section, with the flat six
 * and flat seven chords that make it sound heroic; the horns take the
 * big answer in the B section while the trumpets punch the chords.
 * Driving string eighths, trombones and tuba on the roots, a marching
 * snare that rolls into every turn, timpani and a crash on each
 * section's downbeat.
 */
const BPM = 138;

const CHORDS = {
  D: "D2 D4 F#4 A4",
  C: "C2 C4 E4 G4",
  G: "G1 D4 G4 B4",
  A: "A1 C#4 E4 A4",
  Bm: "B1 D4 F#4 B4",
  Bb: "Bb1 D4 F4 Bb4",
};

const BARS = bars(CHORDS, [
  ["D", "D5 . . A4 D5 . F#5 ."],
  ["D", "A5 . . . . . F#5 G5"],
  ["C", "E5 . . C5 E5 . G5 ."],
  ["G", "D5 . . . . . . ."],
  ["Bb", "F5 . . D5 F5 . Bb5 ."],
  ["C", "A5 . . . G5 . E5 ."],
  ["D", "F#5 . A5 . D6 . . ."],
  ["A", "C#5 . . . E5 . A5 ."],
  ["Bm", "F#5 . . . . . B5 ."],
  ["G", "D6 . . . B5 . G5 ."],
  ["D", "A5 . . . F#5 . D5 ."],
  ["A", "E5 . . . . . . ."],
  ["Bb", "F5 . . . Bb5 . . ."],
  ["C", "C6 . . . G5 . . ."],
  ["D", "A5 . . F#5 A5 . D6 ."],
  ["A", "C#6 . . . A5 . . ."],
]);

/** Where the low brass punch in a bar: a long root on the one, then two short ones off the beat. */
const PUNCH = new Map([[0, 3.5], [6, 1.2], [10, 1.2]]);
/** The marching snare's ghost notes between the backbeats. */
const GHOSTS = new Set([2, 7, 10, 14]);

function play(engine: AudioEngine, out: AudioNode, step: number, at: number, sixteenth: number): void {
  const index = Math.floor(step / 16) % BARS.length;
  const bar = BARS[index]!;
  const inBar = step % 16;
  const [root, ...voicing] = bar.chord;
  const inB = index >= BARS.length / 2;
  const turn = index % 8 === 7;
  const top = voicing.slice(-3);

  // The drums: bass drum, a backbeat snare with ghosts, a roll into each turn, eighth hats.
  if (inBar === 0 || inBar === 6 || inBar === 8) drums.bass(engine, out, at, inBar === 0 ? 0.3 : 0.22);
  if (turn && inBar >= 12) {
    if (inBar === 12) drums.roll(engine, out, at, sixteenth * 4, 0.03, 0.11);
  } else if (inBar === 4 || inBar === 12) drums.snare(engine, out, at, 0.1);
  else if (GHOSTS.has(inBar)) drums.snare(engine, out, at, 0.022);
  if (inBar % 2 === 0) drums.hat(engine, out, at, inBar % 4 === 0 ? 0.02 : 0.012);
  if (inBar === 0 && index % 4 === 0) drums.crash(engine, out, at, index % 8 === 0 ? 0.08 : 0.05);
  if (inBar === 0) drums.timpani(engine, out, at, root! + 12, 0.2);
  if (inB && inBar === 8) drums.timpani(engine, out, at, root! + 19, 0.14);
  if (turn && inBar === 14) drums.tom(engine, out, at, true, 0.14);

  // The band: string eighths, the low brass punches, and the trumpets' stabs in the B section.
  if (inBar % 2 === 0) strings(engine, out, [voicing[0]!, voicing[0]! + 7], at, sixteenth * 1.7, inBar % 4 === 0 ? 0.012 : 0.008);
  const punch = PUNCH.get(inBar);
  if (punch !== undefined) lowBrass(engine, out, root! + 12, at, sixteenth * punch, inBar === 0 ? 0.03 : 0.022);
  if (inB && (inBar === 0 || inBar === 6 || inBar === 10)) trumpets(engine, out, top, at, sixteenth * (inBar === 0 ? 1.8 : 0.9), 0.008);

  if (inBar % 2 === 1) return;
  const note = bar.melody[inBar / 2];
  if (note === null || note === undefined) return;
  const length = heldFor(bar.melody, inBar / 2) * sixteenth * 2;
  if (inB) horns(engine, out, [note - 12, note], at, length * 0.92, 0.016);
  else trumpets(engine, out, [note, note - 12], at, Math.min(1.1, length * 0.85), 0.015);
}

export const GAME_SONG: Song = { bpm: BPM, steps: BARS.length * 16, play };
