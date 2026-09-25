import type { AudioEngine } from "@/platform/audio/audio-engine";
import { midi, noise, tone } from "@/platform/audio/voices";

/**
 * One off musical moments on top of the loop: a brassy victory fanfare
 * with timpani for the winners, and a rising sting for a goal.
 */

/** A brass chord: detuned saws through a warm filter that opens on the attack. */
function brass(engine: AudioEngine, out: AudioNode, at: number, notes: readonly number[], length: number, peak: number): void {
  const { ctx } = engine;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, at);
  filter.frequency.linearRampToValueAtTime(2600, at + 0.08);
  filter.frequency.exponentialRampToValueAtTime(1200, at + length);
  filter.connect(out);
  for (const n of notes) {
    for (const detune of [-7, 7]) tone(engine, filter, at, { type: "sawtooth", frequency: midi(n), attack: 0.03, decay: length, peak, detune });
  }
  setTimeout(() => filter.disconnect(), (at - engine.now + length + 1) * 1000);
}

function timpani(engine: AudioEngine, out: AudioNode, at: number, note: number, peak: number): void {
  tone(engine, out, at, { frequency: midi(note), glideTo: midi(note) * 0.92, decay: 0.8, peak });
  noise(engine, out, at, { filter: "lowpass", frequency: 300, decay: 0.25, peak: peak * 0.4 });
}

/** Da da da daaa: the winners' fanfare, in C major, landing on a big chord. */
export function fanfare(engine: AudioEngine, out: AudioNode): void {
  const at = engine.now + 0.05;
  const beat = 0.19;
  const line: [number, number, number][] = [
    [0, 67, 1], [1, 67, 1], [2, 67, 1], [3, 72, 3], [6, 71, 1], [7, 72, 1], [8, 76, 5],
  ];
  for (const [b, note, len] of line) brass(engine, out, at + b * beat, [note, note - 12, note - 5], len * beat + 0.1, 0.035);
  brass(engine, out, at + 8 * beat, [60, 64, 67, 72], 2.2, 0.03);
  for (const b of [0, 3, 6, 8]) timpani(engine, out, at + b * beat, b === 8 ? 36 : 43, 0.4);
  noise(engine, out, at + 8 * beat, { filter: "highpass", frequency: 6000, decay: 2, peak: 0.1 });
}

/** A quick rising sting under the goal roar. */
export function goalSting(engine: AudioEngine, out: AudioNode): void {
  const at = engine.now + 0.02;
  [60, 64, 67, 72].forEach((n, i) => brass(engine, out, at + i * 0.07, [n, n + 12], 0.35, 0.03));
  brass(engine, out, at + 0.3, [60, 67, 72, 76], 1.2, 0.028);
  timpani(engine, out, at + 0.3, 36, 0.35);
}
