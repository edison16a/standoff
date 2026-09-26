import type { AudioEngine } from "@/platform/audio/audio-engine";
import { bed, choir, percussion, piano, trumpets, tumbao } from "./fiesta";
import { bars, heldFor, type Song } from "./score";

/**
 * "Golden Goal": under the match, a sunny stadium anthem with a Latin
 * groove in B flat major at 124. Sixteen bars: the trumpets blow the
 * hook over the A section, then the terrace choir sings "oh" over the B
 * section while the trumpets punch the chords. A salsa piano montuno, a
 * tumbao bass, surdo, congas, cowbell, claps and a timbale roll into
 * each turn.
 */
const BPM = 124;

const CHORDS = {
  Bb: "Bb1 D4 F4 Bb4",
  F: "F1 C4 F4 A4",
  Gm: "G1 D4 G4 Bb4",
  Eb: "Eb2 Eb4 G4 Bb4",
  Dm: "D2 D4 F4 A4",
  Cm7: "C2 Eb4 G4 Bb4",
  F7sus: "F1 Eb4 F4 Bb4",
};

const BARS = bars(CHORDS, [
  ["Bb", "D5 . F5 . Bb5 . . A5"],
  ["F", ". . G5 . F5 . C5 ."],
  ["Gm", "D5 . F5 . Bb5 . . A5"],
  ["Eb", ". . G5 . Bb5 . . ."],
  ["Bb", "D5 . F5 . Bb5 . . A5"],
  ["F", ". . G5 . F5 . A5 ."],
  ["Eb", "Bb5 . . G5 . . Eb5 ."],
  ["F", "F5 . . . . . . ."],
  ["Eb", "G5 . . . . . Bb5 ."],
  ["F", "A5 . . . . . F5 ."],
  ["Dm", "F5 . . . A5 . . ."],
  ["Gm", "G5 . . . . . D5 ."],
  ["Eb", "Eb5 . . G5 . . Bb5 ."],
  ["F", "C6 . . . A5 . . ."],
  ["Cm7", "G5 . . . Eb5 . . ."],
  ["F7sus", "F5 . . . Eb5 . C5 ."],
]);

/** The montuno: where the piano strikes, and whether it plays the chord or the root in octaves. */
const MONTUNO = new Map<number, "chord" | "octave">([[0, "octave"], [3, "chord"], [6, "chord"], [8, "octave"], [11, "chord"], [14, "chord"]]);
/** The tumbao lands ahead of the beat: on the and of two and on four, with the root on the one. */
const TUMBAO = new Map([[0, 0], [6, 7], [12, 12]]);
/** Conga slaps and open tones: the heartbeat of the groove. */
const CONGA = new Map([[4, false], [6, true], [7, true], [12, false], [14, true], [15, true]]);

function play(engine: AudioEngine, out: AudioNode, step: number, at: number, sixteenth: number): void {
  const index = Math.floor(step / 16) % BARS.length;
  const bar = BARS[index]!;
  const inBar = step % 16;
  const [root, ...voicing] = bar.chord;
  const inB = index >= BARS.length / 2;
  const turn = index === 7 || index === 15;

  if (inBar === 0 || inBar === 8) percussion.surdo(engine, out, at, inBar === 0 ? 0.3 : 0.24);
  if (inBar === 4 || inBar === 12) percussion.clap(engine, out, at, 0.06);
  const conga = CONGA.get(inBar);
  if (conga !== undefined) percussion.conga(engine, out, at, conga, 0.07);
  if (inBar % 4 === 0 || inBar === 6 || inBar === 14) percussion.cowbell(engine, out, at, inBar % 4 === 0 ? 0.026 : 0.018);
  percussion.shaker(engine, out, at, inBar % 2 === 1 ? 0.024 : 0.013);
  if (turn && inBar >= 12) percussion.timbale(engine, out, at, inBar % 2 === 0, 0.05 + 0.01 * (inBar - 12));

  const offset = TUMBAO.get(inBar);
  if (offset !== undefined) tumbao(engine, out, root! + 12 + offset, at, sixteenth * (inBar === 0 ? 5 : 3.5), 0.2);

  if (inBar === 0) bed(engine, out, voicing, at, sixteenth * 16, inB ? 0.009 : 0.007);
  const strike = MONTUNO.get(inBar);
  if (strike === "chord") piano(engine, out, voicing.slice(-3), at, 0.014);
  if (strike === "octave") piano(engine, out, [voicing[0]!, voicing[0]! + 12], at, 0.016);

  if (inB && (inBar === 0 || inBar === 6)) trumpets(engine, out, voicing.slice(-3), at, sixteenth * (inBar === 0 ? 1.6 : 1), 0.009);

  if (inBar % 2 === 1) return;
  const note = bar.melody[inBar / 2];
  if (note === null || note === undefined) return;
  const length = heldFor(bar.melody, inBar / 2) * sixteenth * 2;
  if (inB) choir(engine, out, note, at, length * 0.9, 0.01);
  else trumpets(engine, out, [note, note - 12], at, Math.min(0.9, length * 0.8), 0.017);
}

export const MATCH_SONG: Song = { bpm: BPM, steps: BARS.length * 16, play };
