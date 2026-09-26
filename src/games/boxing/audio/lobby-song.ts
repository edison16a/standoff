import type { AudioEngine } from "@/platform/audio/audio-engine";
import { rhodes, sub, vibes } from "./band";
import { brushes, flugel, strings } from "./lounge";
import { bars, heldFor, swung, type Song } from "./score";

/**
 * "Hand Wraps": the menus, a slow locker room soul tune in A flat major
 * at 76. Sixteen bars: a muted flugelhorn sings the A section, a
 * vibraphone answers in the B section, over a string pad that never
 * stops, a Rhodes, a sub bass and a brushed kit.
 */
const BPM = 76;
const SWING = 0.2;

const CHORDS = {
  Abmaj9: "Ab1 C4 Eb4 G4 Bb4",
  Fm9: "F1 Ab3 C4 Eb4 G4",
  Dbmaj9: "Db2 F3 Ab3 C4 Eb4",
  Eb9sus: "Eb2 Bb3 Db4 F4 Ab4",
  Cm7: "C2 G3 Bb3 Eb4 G4",
  Bbm9: "Bb1 Db4 F4 Ab4 C5",
  Eb13: "Eb2 Db4 G4 C5",
};

const BARS = bars(CHORDS, [
  ["Abmaj9", "C5 . . Eb5 . . G5 ."],
  ["Fm9", "F5 . . . . . Eb5 ."],
  ["Dbmaj9", "C5 . . Ab4 . . F4 ."],
  ["Eb9sus", "Ab4 . . . Bb4 . . ."],
  ["Abmaj9", "C5 . . Eb5 . . G5 ."],
  ["Cm7", "Bb5 . . G5 . . Eb5 ."],
  ["Dbmaj9", "F5 . . . Eb5 . C5 ."],
  ["Eb9sus", "Db5 . . . . . . ."],
  ["Bbm9", "Db5 . F5 . Ab5 . . ."],
  ["Eb13", "G5 . . . F5 . Eb5 ."],
  ["Abmaj9", "Eb5 . . . C5 . . ."],
  ["Fm9", "Ab4 . C5 . Eb5 . G5 ."],
  ["Dbmaj9", "F5 . . Eb5 . . C5 ."],
  ["Cm7", "Eb5 . . . G5 . . ."],
  ["Bbm9", "F5 . . Db5 . . C5 ."],
  ["Eb9sus", "Bb4 . . . . . Ab4 Bb4"],
]);

function play(engine: AudioEngine, out: AudioNode, step: number, at: number, sixteenth: number): void {
  const index = Math.floor(step / 16) % BARS.length;
  const bar = BARS[index]!;
  const inBar = step % 16;
  const time = swung(at, inBar, sixteenth, SWING);
  const [root, ...voicing] = bar.chord;
  const barLength = sixteenth * 16;

  // The pad takes the whole bar and fades under the next chord, so the bed never breaks.
  if (inBar === 0) strings(engine, out, voicing, time, barLength, 0.013);
  if (inBar === 0) rhodes(engine, out, voicing, time + 0.02, barLength * 0.55, 0.012);
  if (inBar === 10) rhodes(engine, out, voicing.slice(1), time, barLength * 0.35, 0.008);

  if (inBar === 0) sub(engine, out, root! + 12, time, sixteenth * 9, 0.2);
  if (inBar === 10) sub(engine, out, root! + 19, time, sixteenth * 5, 0.14);

  if (inBar === 0 || inBar === 10) brushes.kick(engine, out, time, inBar === 0 ? 0.2 : 0.13);
  if (inBar === 4 || inBar === 12) brushes.swish(engine, out, time, 0.04);
  if (inBar % 2 === 0) brushes.sweep(engine, out, time, inBar % 4 === 2 ? 0.02 : 0.012);
  // A soft pickup on the last bar leads the loop back round to the top.
  if (index === BARS.length - 1 && (inBar === 14 || inBar === 15)) brushes.swish(engine, out, time, 0.02);

  if (inBar % 2 === 1) return;
  const note = bar.melody[inBar / 2];
  if (note === null || note === undefined) return;
  const length = heldFor(bar.melody, inBar / 2) * sixteenth * 2;
  if (index < BARS.length / 2) flugel(engine, out, note, time, Math.min(length, 2), 0.034);
  else vibes(engine, out, note, time, 0.075);
}

export const LOBBY_SONG: Song = { bpm: BPM, steps: BARS.length * 16, play };
