import type { AudioEngine } from "../../../platform/audio/audio-engine";
import { midi, noise, tone } from "../../../platform/audio/voices";
import { harpsichord } from "./ensemble";

/** A natural trumpet: a bright saw with a softer square doubling it. */
function trumpet(engine: AudioEngine, out: AudioNode, at: number, note: number, length: number, peak: number): void {
  tone(engine, out, at, { type: "sawtooth", frequency: midi(note), attack: 0.02, decay: length, peak });
  tone(engine, out, at, { type: "square", frequency: midi(note), detune: 6, attack: 0.02, decay: length, peak: peak * 0.4 });
}

function timpani(engine: AudioEngine, out: AudioNode, at: number, note: number, peak: number): void {
  tone(engine, out, at, { frequency: midi(note), glideTo: midi(note) * 0.94, decay: 0.9, peak });
  noise(engine, out, at, { filter: "lowpass", frequency: 280, decay: 0.2, peak: peak * 0.35 });
}

/**
 * The match winner's fanfare: a baroque trumpet call in D major with
 * timpani, a harpsichord run up to it, and a held chord to finish.
 */
export function playFanfare(engine: AudioEngine, out: AudioNode): void {
  const at = engine.now + 0.05;
  [62, 64, 66, 67, 69, 71, 73, 74].forEach((note, i) => harpsichord(engine, out, at + i * 0.045, note + 12, 0.04));
  const call = at + 0.4;
  const step = 0.14;
  const line: [number, number, number][] = [[0, 69, 1], [1, 69, 1], [2, 74, 2], [4, 78, 1], [5, 76, 1], [6, 74, 1], [7, 78, 1], [8, 81, 4]];
  for (const [b, note, len] of line) trumpet(engine, out, call + b * step, note, len * step + 0.06, 0.045);
  const held = call + 8 * step;
  for (const note of [62, 66, 69, 74]) trumpet(engine, out, held, note, 2, 0.022);
  for (const b of [0, 2, 4, 8]) timpani(engine, out, call + b * step, b === 8 ? 38 : b === 2 ? 45 : 38, 0.32);
}
