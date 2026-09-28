import type { AudioEngine } from "@/platform/audio/audio-engine";
import { flute, hands, hum, nylon, sunset, upright } from "./lounge";
import { bars, heldFor, swung, type Song } from "./score";

/**
 * "Sunday League": the lobby and the results, a slow sunny bossa in G
 * major at 90, the warm up before kick off. Sixteen bars: an alto flute
 * sings the A section and a hummed "oo" answers in the B section, over
 * a sunset pad that never stops, a softly brushed nylon guitar, a round
 * bass, a shaker and a quiet clave.
 */
const BPM = 90;
const SWING = 0.1;

const CHORDS = {
  Gmaj9: "G1 F#3 A3 B3 D4",
  Em9: "E2 G3 B3 D4 F#4",
  Am9: "A1 G3 B3 C4 E4",
  D9sus: "D2 C4 E4 G4 A4",
  Bm7: "B1 A3 D4 F#4",
  Cmaj9: "C2 B3 D4 E4 G4",
};

const BARS = bars(CHORDS, [
  ["Gmaj9", "B4 . . D5 . . F#5 ."],
  ["Em9", "G5 . . . F#5 . . D5"],
  ["Am9", "E5 . . . C5 . . ."],
  ["D9sus", "D5 . . . . . A4 ."],
  ["Gmaj9", "B4 . . D5 . . F#5 ."],
  ["Bm7", "A5 . . . F#5 . . ."],
  ["Cmaj9", "G5 . . E5 . . D5 ."],
  ["D9sus", "E5 . . . . . . ."],
  ["Cmaj9", "E5 . . . G5 . . ."],
  ["Bm7", "F#5 . . . D5 . . ."],
  ["Am9", "C5 . . . E5 . . ."],
  ["Gmaj9", "D5 . . . B4 . . ."],
  ["Cmaj9", "E5 . G5 . B5 . . ."],
  ["Bm7", "A5 . . . F#5 . . ."],
  ["Am9", "G5 . . E5 . . C5 ."],
  ["D9sus", "D5 . . . . . A4 ."],
]);

/** The bossa clave, a three then a two, is what makes it lilt. */
const CLAVE = new Set([0, 3, 6, 10, 12]);
const STRUMS = new Set([0, 6, 10]);

function play(engine: AudioEngine, out: AudioNode, step: number, at: number, sixteenth: number): void {
  const index = Math.floor(step / 16) % BARS.length;
  const bar = BARS[index]!;
  const inBar = step % 16;
  const time = swung(at, inBar, sixteenth, SWING);
  const [root, ...voicing] = bar.chord;

  if (inBar === 0) sunset(engine, out, voicing, time, sixteenth * 16, 0.009);
  if (STRUMS.has(inBar)) nylon(engine, out, voicing, time, inBar === 0 ? 0.016 : 0.011);

  if (inBar === 0) upright(engine, out, root! + 12, time, sixteenth * 5, 0.17);
  if (inBar === 6 || inBar === 8) upright(engine, out, root! + 19, time, sixteenth * (inBar === 6 ? 2 : 5), 0.13);

  if (inBar === 0 || inBar === 8) hands.kick(engine, out, time, inBar === 0 ? 0.2 : 0.14);
  if (CLAVE.has(inBar)) hands.clave(engine, out, time, 0.018);
  hands.shaker(engine, out, time, inBar % 4 === 2 ? 0.022 : 0.011);

  if (inBar % 2 === 1) return;
  const note = bar.melody[inBar / 2];
  if (note === null || note === undefined) return;
  const length = Math.min(2, heldFor(bar.melody, inBar / 2) * sixteenth * 2);
  if (index < BARS.length / 2) flute(engine, out, note, time, length, 0.04);
  else hum(engine, out, note, time, length, 0.036);
}

export const LOBBY_SONG: Song = { bpm: BPM, steps: BARS.length * 16, play };
