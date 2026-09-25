import type { AudioEngine } from "@/platform/audio/audio-engine";
import { horn, kit, rhodes, sub, vibes } from "./band";
import { bars, heldFor } from "./score";

/**
 * "Corner Work": the gym tune, a laid back hip hop groove in D minor at
 * 94. Sixteen bars: the A section has the horn hook, the B section
 * answers on the vibraphone over a turn through the relative major. Steps
 * are sixteenths; the tune is written in eighths on the even ones.
 */
export const BPM = 94;
export const SIXTEENTH = 60 / BPM / 4;
/** How late the off sixteenths land, as a share of a sixteenth. That lag is the head nod. */
const SWING = 0.28;

const CHORDS = {
  Dm9: "D2 F3 A3 C4 E4",
  Bbmaj7: "Bb1 D3 F3 A3",
  Gm9: "G2 Bb3 D4 F4 A4",
  A7: "A2 G3 C#4 E4",
  Gm7: "G2 F3 Bb3 D4",
  C7: "C2 E3 Bb3 D4",
  Fmaj7: "F2 E3 A3 C4",
  Em7b5: "E2 D3 G3 Bb3",
  Dm7: "D2 F3 A3 C4",
};

const BARS = bars(CHORDS, [
  ["Dm9", "D5 . F5 . A5 . . G5"],
  ["Bbmaj7", "F5 . . . D5 . . ."],
  ["Gm9", "G4 . Bb4 . D5 . F5 ."],
  ["A7", "E5 . . . C#5 . A4 ."],
  ["Dm9", "D5 . F5 . A5 . . G5"],
  ["Bbmaj7", "F5 . A5 . C6 . . A5"],
  ["Gm9", "G5 . F5 . D5 . F5 ."],
  ["A7", "E5 . . . . . . ."],
  ["Gm7", "Bb5 . A5 . G5 . F5 ."],
  ["C7", "E5 . G5 . Bb5 . . ."],
  ["Fmaj7", "A5 . . . E5 . F5 ."],
  ["Bbmaj7", "D5 . . . . . F5 ."],
  ["Em7b5", "G5 . Bb5 . . . A5 ."],
  ["A7", "C#5 . E5 . G5 . . ."],
  ["Dm7", "F5 . E5 . D5 . A4 ."],
  ["A7", "C#5 . . . E5 . . ."],
]);

export const STEPS = BARS.length * 16;

/** Boom bap: the kick skips a step before the third beat, the snare sits on two and four. */
const KICK = new Set([0, 7, 10]);
const SNARE = new Set([4, 12]);
const RHODES = new Map([
  [0, 6],
  [7, 2],
  [10, 3],
]);

export function playStep(engine: AudioEngine, out: AudioNode, step: number, at: number): void {
  const index = Math.floor(step / 16);
  const bar = BARS[index]!;
  const inBar = step % 16;
  const time = at + (inBar % 2 === 1 ? SWING * SIXTEENTH : 0);
  const root = bar.chord[0]!;

  if (KICK.has(inBar)) kit.kick(engine, out, time, inBar === 0 ? 0.34 : 0.26);
  if (SNARE.has(inBar)) kit.snare(engine, out, time);
  if (inBar % 2 === 0) kit.hat(engine, out, time, inBar % 4 === 2 ? 0.035 : 0.022);
  else if (inBar === 15 || inBar === 9) kit.hat(engine, out, time, 0.014);
  kit.crackle(engine, out, time);

  if (inBar === 0) sub(engine, out, root + 12, time, SIXTEENTH * 6);
  if (inBar === 7) sub(engine, out, root + 12, time, SIXTEENTH * 2, 0.2);
  if (inBar === 10) sub(engine, out, root + 19, time, SIXTEENTH * 4, 0.21);

  const comp = RHODES.get(inBar);
  if (comp) rhodes(engine, out, bar.chord.slice(1), time, comp * SIXTEENTH * 1.4, 0.022);

  if (inBar % 2 === 1) return;
  const note = bar.melody[inBar / 2];
  if (note === null || note === undefined) return;
  const length = heldFor(bar.melody, inBar / 2) * SIXTEENTH * 2;
  if (index < BARS.length / 2) horn(engine, out, note, time, Math.min(length, 1.2), 0.05);
  else vibes(engine, out, note, time, 0.06);
}
