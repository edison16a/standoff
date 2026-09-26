import type { AudioEngine } from "@/platform/audio/audio-engine";
import { choir, padded, sax, softBass, wurli } from "./lounge";
import { bars, heldFor, swung, type Song } from "./score";

/**
 * "Night Court": the lobby and the results, a slow late night soul tune
 * in D flat major at 82. Sixteen bars: a mellow sax sings the A section
 * and the Wurlitzer answers in the B section, over a choir pad that
 * never stops, a round bass and a padded kit.
 */
const BPM = 82;
const SWING = 0.2;

const CHORDS = {
  Dbmaj9: "Db2 F3 Ab3 C4 Eb4",
  Bbm9: "Bb1 Ab3 C4 Db4 F4",
  Gbmaj9: "Gb1 F3 Ab3 Bb3 Db4",
  Ab13: "Ab1 Gb3 C4 F4",
  Fm7: "F1 Ab3 C4 Eb4",
  Ab9sus: "Ab1 Gb3 Bb3 Db4 Eb4",
  Ebm9: "Eb2 Gb3 Bb3 Db4 F4",
};

const BARS = bars(CHORDS, [
  ["Dbmaj9", "F5 . . Eb5 . . C5 ."],
  ["Bbm9", "Db5 . . . . . Ab4 ."],
  ["Gbmaj9", "Bb4 . . Db5 . . F5 ."],
  ["Ab13", "Eb5 . . . . . . ."],
  ["Dbmaj9", "F5 . . Eb5 . . C5 ."],
  ["Fm7", "Ab5 . . . F5 . . Eb5"],
  ["Gbmaj9", "Db5 . . . F5 . . ."],
  ["Ab9sus", "Eb5 . . . . . . ."],
  ["Ebm9", "Gb5 . . F5 . . Db5 ."],
  ["Ab13", "C5 . . . Eb5 . . ."],
  ["Dbmaj9", "F5 . . . C5 . . ."],
  ["Bbm9", "Db5 . . . . . . ."],
  ["Gbmaj9", "Bb4 . Db5 . F5 . Ab5 ."],
  ["Fm7", "Ab5 . . . Eb5 . . ."],
  ["Ebm9", "Gb5 . . . F5 . Db5 ."],
  ["Ab9sus", "Eb5 . . . . . Db5 Eb5"],
]);

function play(engine: AudioEngine, out: AudioNode, step: number, at: number, sixteenth: number): void {
  const index = Math.floor(step / 16) % BARS.length;
  const bar = BARS[index]!;
  const inBar = step % 16;
  const time = swung(at, inBar, sixteenth, SWING);
  const [root, ...voicing] = bar.chord;
  const barLength = sixteenth * 16;
  const inB = index >= BARS.length / 2;

  if (inBar === 0) choir(engine, out, voicing, time, barLength, 0.0095);
  if (inBar === 0 || inBar === 7) wurli(engine, out, voicing, time, barLength * (inBar === 0 ? 0.4 : 0.3), inBar === 0 ? 0.012 : 0.008);

  if (inBar === 0) softBass(engine, out, root! + 12, time, sixteenth * 8, 0.2);
  if (inBar === 11) softBass(engine, out, root! + 19, time, sixteenth * 4, 0.14);

  if (inBar === 0 || inBar === 9) padded.kick(engine, out, time, inBar === 0 ? 0.21 : 0.14);
  if (inBar === 4 || inBar === 12) padded.stick(engine, out, time, 0.05);
  if (inBar % 2 === 0) padded.shaker(engine, out, time, inBar % 4 === 2 ? 0.024 : 0.014);

  if (inBar % 2 === 1) return;
  const note = bar.melody[inBar / 2];
  if (note === null || note === undefined) return;
  const length = heldFor(bar.melody, inBar / 2) * sixteenth * 2;
  if (!inB) sax(engine, out, note, time, Math.min(length, 2), 0.05);
  else wurli(engine, out, [note - 12, note], time, Math.max(0.7, length), 0.03);
}

export const LOBBY_SONG: Song = { bpm: BPM, steps: BARS.length * 16, play };
