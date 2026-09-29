import type { AudioEngine } from "@/platform/audio/audio-engine";
import { horns, lowBrass, trumpets } from "./brass";
import { drums } from "./drums";

/**
 * One off musical moments on top of the loop, all in the theme's key of
 * D: the touchdown fanfare, a short lift for a good kick, a sinking
 * brass line for a turnover, the bumper at the end of a quarter, and the
 * winners' fanfare at the final whistle.
 */

/** Ta ta ta taaa over a timpani roll, landing on a big D major chord with a crash. */
export function touchdown(engine: AudioEngine, out: AudioNode): void {
  const at = engine.now + 0.03;
  const beat = 0.13;
  [69, 74, 78].forEach((n, i) => trumpets(engine, out, [n, n - 12], at + i * beat, beat * 0.8, 0.03));
  for (let i = 0; i < 10; i++) drums.timpani(engine, out, at + i * 0.04, 45, 0.05 + i * 0.012);
  const land = at + 3 * beat;
  trumpets(engine, out, [81, 78, 74, 69], land, 1.3, 0.026);
  horns(engine, out, [62, 66], land, 1.4, 0.03);
  lowBrass(engine, out, 50, land, 1.4, 0.05);
  drums.timpani(engine, out, land, 38, 0.4);
  drums.crash(engine, out, land, 0.14);
  drums.bass(engine, out, land, 0.4);
}

/** A kick through the posts: two rising brass chords. */
export function goodKick(engine: AudioEngine, out: AudioNode): void {
  const at = engine.now + 0.03;
  trumpets(engine, out, [69, 64, 57], at, 0.16, 0.024);
  trumpets(engine, out, [74, 69, 66], at + 0.2, 0.9, 0.024);
  lowBrass(engine, out, 50, at + 0.2, 0.9, 0.04);
  drums.timpani(engine, out, at + 0.2, 38, 0.3);
  drums.crash(engine, out, at + 0.2, 0.07);
}

/** A turnover or a miss: two low brass notes sinking a semitone. */
export function sink(engine: AudioEngine, out: AudioNode): void {
  const at = engine.now + 0.03;
  lowBrass(engine, out, 45, at, 0.28, 0.05);
  lowBrass(engine, out, 44, at + 0.34, 0.8, 0.05);
  horns(engine, out, [57, 60], at, 0.28, 0.02);
  horns(engine, out, [56, 59], at + 0.34, 0.8, 0.02);
}

/** The end of a quarter: a timpani hit under one held brass chord, like a network bumper. */
export function bumper(engine: AudioEngine, out: AudioNode): void {
  const at = engine.now + 0.03;
  drums.timpani(engine, out, at, 38, 0.35);
  drums.crash(engine, out, at, 0.06);
  horns(engine, out, [62, 66, 69], at, 1.2, 0.028);
  lowBrass(engine, out, 38, at, 1.2, 0.04);
}

/** Da da da daaa: the winners' fanfare, landing on a long D major chord with rolling timpani. */
export function fanfare(engine: AudioEngine, out: AudioNode): void {
  const at = engine.now + 0.05;
  const beat = 0.18;
  const line: [number, number, number][] = [[0, 69, 1], [1, 69, 1], [2, 69, 1], [3, 74, 3], [6, 73, 1], [7, 74, 1], [8, 78, 5]];
  for (const [b, note, len] of line) trumpets(engine, out, [note, note - 12], at + b * beat, len * beat, 0.028);
  for (const b of [0, 3, 6]) drums.timpani(engine, out, at + b * beat, b === 3 ? 38 : 45, 0.3);
  const land = at + 8 * beat;
  horns(engine, out, [62, 66, 69], land, 2.2, 0.03);
  lowBrass(engine, out, 38, land, 2.2, 0.05);
  for (let i = 0; i < 16; i++) drums.timpani(engine, out, land + i * 0.05, 38, 0.06 + i * 0.01);
  drums.crash(engine, out, land + 0.8, 0.14);
}
