import type { AudioEngine } from "@/platform/audio/audio-engine";
import { bass, brush, crash, hat, kick, shaker, snare, tom } from "./kit";
import { chug, lead, organ } from "./synths";
import type { Tune } from "./tunes";

/**
 * The two bands. Each is told "step n of the tune starts at time t" and
 * books whatever plays on that sixteenth. The A half is the first eight
 * bars and the B half the last eight, so a tune runs sixteen bars before
 * it repeats.
 */

interface Beat {
  inBar: number;
  bar: number;
  /** In the B half. */
  lift: boolean;
  /** The last bar of a half, where the drums fill. */
  turn: boolean;
  root: number;
  chord: number[];
  at: number;
  sixteenth: number;
}

function beatOf(tune: Tune, step: number, at: number): Beat {
  const sixteenth = 60 / tune.bpm / 4;
  const inBar = step % 16;
  const bar = Math.floor(step / 16) % tune.chords.length;
  const [root, ...chord] = tune.chords[bar]!;
  const half = tune.chords.length / 2;
  return {
    inBar,
    bar,
    lift: bar >= half,
    turn: bar % half === half - 1,
    root: root!,
    chord,
    // Swing pushes the odd sixteenths late, which is what makes a groove lean back.
    at: at + (inBar % 2 === 1 ? sixteenth * tune.swing : 0),
    sixteenth,
  };
}

function melody(engine: AudioEngine, out: AudioNode, tune: Tune, step: number, b: Beat, peak: number): void {
  const note = tune.hook[step % tune.hook.length];
  if (note) lead(engine, out, b.at, note.midi, note.steps * b.sixteenth * 0.94, tune.lead, peak);
}

function lowEnd(engine: AudioEngine, out: AudioNode, tune: Tune, b: Beat, hold: number, peak: number): void {
  const offset = tune.bass[b.inBar];
  if (offset !== null && offset !== undefined) bass(engine, out, b.at, b.root + offset, b.sixteenth * hold, peak);
}

/** Fast and loud: four on the floor, sixteenth hats, tom fills and a chugging guitar under the lead. */
function battle(engine: AudioEngine, out: AudioNode, tune: Tune, step: number, b: Beat): void {
  const { inBar, at } = b;
  const fill = b.turn && inBar >= 12;
  if (inBar % 4 === 0 || (b.lift && inBar === 10)) kick(engine, out, at, inBar === 0 ? 0.3 : 0.25);
  if ((inBar === 4 || inBar === 12) && !fill) snare(engine, out, at, 0.1);
  if (inBar === 7 || inBar === 15) snare(engine, out, at, 0.022);
  if (fill) tom(engine, out, at, 52 - (inBar - 12) * 3, 0.16);
  hat(engine, out, at, inBar % 4 === 2 ? 0.032 : inBar % 2 === 0 ? 0.02 : 0.011, b.lift && inBar === 14);
  if (inBar === 0 && b.bar % 8 === 0) crash(engine, out, at, 0.08);

  lowEnd(engine, out, tune, b, 1.6, 0.12);
  if (inBar % 2 === 0 && !fill) chug(engine, out, at, b.root + 12, b.lift ? 0.04 : 0.032);
  // Under the soaring B half, a wide chord holds the harmony together.
  if (b.lift && inBar === 0) for (const note of b.chord) lead(engine, out, at, note, b.sixteenth * 15, "wide", 0.007);
  melody(engine, out, tune, step, b, 0.045);
}

/** Soft and warm: a swelling organ, a round bass, a lazy kick with brushes and a shaker. */
function lobby(engine: AudioEngine, out: AudioNode, tune: Tune, step: number, b: Beat): void {
  const { inBar, at } = b;
  if (inBar === 0 || inBar === 10) kick(engine, out, at, inBar === 0 ? 0.2 : 0.14);
  if (inBar === 4 || inBar === 12) brush(engine, out, at, 0.05);
  if (b.lift && inBar === 15) brush(engine, out, at, 0.018);
  if (inBar % 2 === 0) shaker(engine, out, at, inBar % 4 === 2 ? 0.022 : 0.012);
  if (b.turn && inBar === 8) crash(engine, out, at, 0.02);

  lowEnd(engine, out, tune, b, 5, 0.13);
  if (inBar === 0) organ(engine, out, at, b.chord, b.sixteenth * 16, b.lift ? 0.013 : 0.011);
  melody(engine, out, tune, step, b, 0.05);
}

/** Plays whatever falls on one sixteenth of a tune. */
export function playStep(engine: AudioEngine, out: AudioNode, tune: Tune, step: number, at: number): void {
  const b = beatOf(tune, step, at);
  if (tune.style === "lobby") lobby(engine, out, tune, step, b);
  else battle(engine, out, tune, step, b);
}
