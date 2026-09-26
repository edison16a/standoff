import type { AudioEngine } from "@/platform/audio/audio-engine";
import { crash, hat, kick, rim, riser, shaker, snare, sub, tom } from "./kit";
import { lead, pad, pulse } from "./synths";
import type { Tune } from "./tunes";

/**
 * The two bands. Each is told "step n of the tune starts at time t" and
 * books whatever plays on that sixteenth. The B half of a tune (its last
 * eight bars) lifts: more kick, a brighter pad, rims under the snare.
 */

interface Beat {
  inBar: number;
  bar: number;
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
    root: root! + tune.key,
    chord: chord.map((note) => note + tune.key),
    // Swing pushes the odd sixteenths late, which is what makes a groove lean back.
    at: at + (inBar % 2 === 1 ? sixteenth * tune.swing : 0),
    sixteenth,
  };
}

function melody(engine: AudioEngine, out: AudioNode, tune: Tune, step: number, b: Beat, peak: number): void {
  const note = tune.hook[step % tune.hook.length];
  if (note) lead(engine, out, b.at, note.midi + tune.key, note.steps * b.sixteenth * 0.92, tune.lead, peak);
}

/** Tense and driving: a sixteenth pulse, a stalking kick, ticking hats and tom fills. */
function match(engine: AudioEngine, out: AudioNode, tune: Tune, step: number, b: Beat): void {
  const { inBar, at } = b;
  const fill = b.turn && inBar >= 12;
  if ([0, 6, 8, 14].includes(inBar) || (b.lift && inBar === 10)) kick(engine, out, at, inBar === 0 ? 0.25 : 0.2);
  if ((inBar === 4 || inBar === 12) && !fill) snare(engine, out, at, 0.08);
  if (b.lift && (inBar === 7 || inBar === 13)) rim(engine, out, at, 0.035);
  if (fill) tom(engine, out, at, 50 - (inBar - 12) * 3, 0.15);
  if (b.turn && inBar === 12) riser(engine, out, at, b.sixteenth * 3.5, 0.03);
  hat(engine, out, at, inBar % 4 === 2 ? 0.026 : 0.011);
  if (inBar === 0 && b.bar % 8 === 0) crash(engine, out, at, 0.07);

  // The pulse: the root on every sixteenth, an octave up on the off beats, never letting go.
  pulse(engine, out, at, b.root + (inBar % 4 === 2 ? 12 : 0), b.sixteenth * 0.9, inBar % 4 === 0 ? 0.045 : 0.03);
  if (inBar === 0) pad(engine, out, at, b.chord, b.sixteenth * 16, 0.011, b.lift ? 1500 : 950);
  melody(engine, out, tune, step, b, 0.048);
}

/** Calm and dark: a held pad and sub, vibes, a rim on three and a soft shaker. */
function lobby(engine: AudioEngine, out: AudioNode, tune: Tune, step: number, b: Beat): void {
  const { inBar, at } = b;
  if (inBar === 0) kick(engine, out, at, 0.12);
  if (inBar === 10) kick(engine, out, at, 0.07);
  if (inBar === 8) rim(engine, out, at, 0.05);
  if (inBar % 2 === 0) shaker(engine, out, at, inBar % 4 === 2 ? 0.02 : 0.01);
  if (b.lift && inBar % 4 === 2) hat(engine, out, at, 0.008);

  if (inBar === 0) sub(engine, out, at, b.root, b.sixteenth * 16, 0.05);
  if (inBar === 0) pad(engine, out, at, b.chord, b.sixteenth * 16, 0.012, b.lift ? 1300 : 1000);
  melody(engine, out, tune, step, b, 0.055);
}

/** Plays whatever falls on one sixteenth of a tune. */
export function playStep(engine: AudioEngine, out: AudioNode, tune: Tune, step: number, at: number): void {
  const b = beatOf(tune, step, at);
  if (tune.style === "lobby") lobby(engine, out, tune, step, b);
  else match(engine, out, tune, step, b);
}
