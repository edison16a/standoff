import type { AudioEngine } from "../../../platform/audio/audio-engine";
import { brass, choir, cymbal, horn, taiko } from "./instruments";

/**
 * The winner's fanfare: taiko hits building to a brass call in D major,
 * a crash, and a held chord with the choir, the battle theme's hook
 * turned from minor to major.
 */
export function playFanfare(engine: AudioEngine, out: AudioNode): void {
  const at = engine.now + 0.05;
  const step = 0.13;
  [0, 2, 3].forEach((b, i) => taiko(engine, out, at + b * step, 0.3 + i * 0.08));
  const call = at + 4 * step;
  const line: [number, number, number][] = [[0, 69, 1], [1, 69, 1], [2, 74, 2], [4, 78, 1], [5, 76, 1], [6, 74, 1], [7, 78, 1], [8, 81, 5]];
  for (const [b, note, len] of line) horn(engine, out, call + b * step, note, len * step, 0.06);
  const held = call + 8 * step;
  brass(engine, out, held, [50, 57, 62, 66], 2.2, 0.016);
  choir(engine, out, held, [62, 66, 69], 2.4, 0.014);
  cymbal(engine, out, held, 0.14);
  taiko(engine, out, held, 0.5);
}
