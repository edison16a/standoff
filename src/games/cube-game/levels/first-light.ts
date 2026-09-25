import { LevelBuilder } from "../engine/builder";
import { ufoGates } from "../engine/placement";
import type { Level, LevelInfo } from "../engine/types";
import { hop, hops, padOver, platform } from "./patterns";

export const info: LevelInfo = { id: "first-light", name: "First Light", difficulty: 1, bpm: 110, theme: "first-light" };

/**
 * Level 1, easy. Single spikes two beats apart to learn the jump, one
 * platform, a pad, and a gentle UFO stretch with wide gates.
 */
export function build(): Level {
  const b = new LevelBuilder(info, 8.6);
  hops(b, [8, 12, 16]);
  hop(b, 20, 2);
  hops(b, [24, 26]);
  platform(b, 30, 1, 36);
  hop(b, 33, 1, 1);
  hop(b, 38, 2);
  padOver(b, 42);

  b.portal(46, "ufo");
  b.jump(47, 48, 49, 51, 52, 54, 55, 57, 58);
  ufoGates(b, [50, 53, 56], 1.7);
  b.portal(60, "cube");

  hops(b, [64, 66]);
  hop(b, 68, 2);
  hops(b, [72, 74, 76]);
  return b.end(84).build();
}
