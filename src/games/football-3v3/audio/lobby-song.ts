import type { AudioEngine } from "@/platform/audio/audio-engine";
import { bass, keys, kit, vibes } from "./lounge";
import { bars, heldFor, swung, type Song } from "./score";

/**
 * "Tailgate": the lobby and the results, a laid back soul groove in F
 * major at 82 with a little swing, like the car park hours before
 * kickoff. Sixteen bars of major sevenths and ninths: a vibraphone
 * sings the tune over an electric piano, a round bass and a kit played
 * with brushes.
 */
const BPM = 82;
const SWING = 0.14;

const CHORDS = {
  Fmaj7: "F2 A3 C4 E4",
  Em7: "E2 G3 B3 D4",
  Dm9: "D2 F3 A3 C4 E4",
  Cmaj7: "C2 G3 B3 E4",
  Bbmaj7: "Bb1 A3 D4 F4",
  Am7: "A1 G3 C4 E4",
  Gm9: "G1 F3 Bb3 D4 A4",
  C9sus: "C2 Bb3 D4 F4 G4",
};

const BARS = bars(CHORDS, [
  ["Fmaj7", "C5 . . E5 . . A5 ."],
  ["Em7", "G5 . . . E5 . . D5"],
  ["Dm9", "F5 . . . E5 . . ."],
  ["Cmaj7", "E5 . . . . . G4 ."],
  ["Bbmaj7", "D5 . . F5 . . A5 ."],
  ["Am7", "G5 . . . E5 . . ."],
  ["Gm9", "F5 . . A5 . . Bb5 ."],
  ["C9sus", "G5 . . . . . . ."],
  ["Bbmaj7", "F5 . . . D5 . . ."],
  ["Am7", "E5 . . . C5 . . ."],
  ["Dm9", "F5 . . . A5 . . ."],
  ["Gm9", "Bb5 . . . A5 . F5 ."],
  ["Bbmaj7", "D5 . . F5 . . A5 ."],
  ["Am7", "C6 . . . G5 . . ."],
  ["Gm9", "A5 . . . F5 . . ."],
  ["C9sus", "G5 . . . . . . ."],
]);

/** Where the bass plays in a bar, as steps above the root: the one, the fifth ahead of three, and a walk up. */
const LINE = new Map([[0, 0], [7, 7], [10, 12], [14, 10]]);

function play(engine: AudioEngine, out: AudioNode, step: number, at: number, sixteenth: number): void {
  const index = Math.floor(step / 16) % BARS.length;
  const bar = BARS[index]!;
  const inBar = step % 16;
  const time = swung(at, inBar, sixteenth, SWING);
  const [root, ...voicing] = bar.chord;

  if (inBar === 0 || inBar === 10) kit.kick(engine, out, time, inBar === 0 ? 0.2 : 0.13);
  if (inBar === 4 || inBar === 12) kit.brush(engine, out, time, 0.045);
  if (inBar % 2 === 0) kit.hat(engine, out, time, inBar % 4 === 2 ? 0.02 : 0.011);

  if (inBar === 0) keys(engine, out, voicing, time, sixteenth * 7, 0.022);
  if (inBar === 6 || inBar === 11) keys(engine, out, voicing.slice(-3), time, sixteenth * 2.5, 0.015);

  // The lowest roots come up an octave, so a small speaker still carries the line.
  const low = root! < 36 ? root! + 12 : root!;
  const walk = LINE.get(inBar);
  if (walk !== undefined) bass(engine, out, low + walk, time, sixteenth * (inBar === 0 ? 5 : 2.5), 0.18);

  if (inBar % 2 === 1) return;
  const note = bar.melody[inBar / 2];
  if (note === null || note === undefined) return;
  const length = Math.min(2, heldFor(bar.melody, inBar / 2) * sixteenth * 2);
  vibes(engine, out, note, time, length, index < BARS.length / 2 ? 0.05 : 0.045);
}

export const LOBBY_SONG: Song = { bpm: BPM, steps: BARS.length * 16, play };
