import type { AudioEngine } from "@/platform/audio/audio-engine";
import { bass, glide, keys, pad, softKit } from "./band";
import { bars, heldFor, swung, type Song } from "./score";

/**
 * "Night Platform": the menus, a slow late night groove in F major at
 * 100, the disco band's lounge cousin. Sixteen bars: a soft gliding lead
 * floats over the A section and the electric piano sings the B section,
 * over a breathing pad that never stops, a round bass and a padded kit.
 */
const BPM = 100;
const SWING = 0.12;

const CHORDS = {
  Fmaj9: "F2 A3 C4 E4 G4",
  Am7: "A1 G3 C4 E4",
  Dm9: "D2 F3 A3 C4 E4",
  Bbmaj7: "Bb1 A3 D4 F4",
  Gm9: "G1 F3 Bb3 D4 A4",
  C9sus: "C2 Bb3 D4 F4 G4",
  Bbmaj9: "Bb1 A3 C4 D4 F4",
  Gm7: "G1 F3 Bb3 D4",
};

const BARS = bars(CHORDS, [
  ["Fmaj9", "A4 . . C5 . . E5 ."],
  ["Am7", "G5 . . . E5 . . ."],
  ["Dm9", "F5 . . E5 . . D5 ."],
  ["Bbmaj7", "C5 . . . . . A4 ."],
  ["Fmaj9", "A4 . . C5 . . E5 ."],
  ["Am7", "G5 . . . A5 . . ."],
  ["Gm9", "Bb5 . . A5 . . F5 ."],
  ["C9sus", "G5 . . . . . . ."],
  ["Bbmaj9", "D5 . . . F5 . . ."],
  ["Am7", "E5 . . . C5 . . ."],
  ["Gm9", "D5 . . . Bb4 . . ."],
  ["Fmaj9", "C5 . . . A4 . . ."],
  ["Bbmaj9", "D5 . F5 . A5 . . ."],
  ["Am7", "G5 . . . E5 . . ."],
  ["Gm7", "F5 . . . D5 . . ."],
  ["C9sus", "D5 . . . . . C5 ."],
]);

function play(engine: AudioEngine, out: AudioNode, step: number, at: number, sixteenth: number): void {
  const index = Math.floor(step / 16) % BARS.length;
  const bar = BARS[index]!;
  const inBar = step % 16;
  const time = swung(at, inBar, sixteenth, SWING);
  const [root, ...voicing] = bar.chord;
  const barLength = sixteenth * 16;

  if (inBar === 0) pad(engine, out, time, voicing, barLength, 0.0085);
  if (inBar === 0) keys(engine, out, time + 0.01, voicing, barLength * 0.4, 0.011);
  if (inBar === 7) keys(engine, out, time, voicing.slice(-3), barLength * 0.3, 0.008);

  if (inBar === 0) bass(engine, out, time, root! + 12, sixteenth * 7, 0.19);
  if (inBar === 10) bass(engine, out, time, root! + 19, sixteenth * 3, 0.14);
  if (inBar === 14) bass(engine, out, time, root! + 24, sixteenth * 2, 0.11);

  if (inBar === 0 || inBar === 8) softKit.kick(engine, out, time, inBar === 0 ? 0.22 : 0.16);
  if (inBar === 4 || inBar === 12) softKit.snap(engine, out, time, 0.045);
  if (inBar % 2 === 0) softKit.shaker(engine, out, time, inBar % 4 === 2 ? 0.026 : 0.015);

  if (inBar % 2 === 1) return;
  const note = bar.melody[inBar / 2];
  if (note === null || note === undefined) return;
  const length = heldFor(bar.melody, inBar / 2) * sixteenth * 2;
  if (index < BARS.length / 2) glide(engine, out, time, note, Math.min(length, 2), 0.038);
  else keys(engine, out, time, [note - 12, note], Math.max(0.6, length), 0.044);
}

export const LOBBY_SONG: Song = { bpm: BPM, steps: BARS.length * 16, play };
