import { LevelBuilder } from "../engine/builder";
import { ballSpikes, ufoGates } from "../engine/placement";
import type { Level, LevelInfo } from "../engine/types";
import { gap, hop, hops, padOrb, platform } from "./patterns";

export const info: LevelInfo = { id: "cloud-hopper", name: "Cloud Hopper", difficulty: 3, bpm: 122, theme: "cloud-hopper" };

/**
 * Level 3, hard. Jumps on three beats in a row, orbs caught at the top
 * of a pad's throw, and a long UFO flight through narrower gates.
 */
export function build(): Level {
  const b = new LevelBuilder(info, 9.6);
  hops(b, [8, 9, 10]);
  hop(b, 12, 2);
  platform(b, 14, 1, 20);
  hop(b, 16, 2, 1);
  hop(b, 18, 1, 1);
  padOrb(b, 22, 22.75);
  hop(b, 26, 2);
  gap(b, 28);

  b.portal(31, "ufo");
  b.jump(32, 33, 34, 36, 37, 39, 40, 41, 43, 44, 46);
  ufoGates(b, [35, 38, 42, 45], 1.3);
  b.portal(48, "cube");

  hops(b, [51, 52]);
  hop(b, 54, 2);
  platform(b, 56, 1, 61);
  hop(b, 58, 2, 1);
  padOrb(b, 63, 63.75);
  hops(b, [67, 68, 69]);

  b.portal(71, "ball");
  b.jump(72, 74, 75, 77, 79, 80);
  ballSpikes(b, 73, 80);
  b.portal(82, "cube");

  hop(b, 85);
  platform(b, 87, 1, 92);
  hop(b, 89, 2, 1);
  padOrb(b, 94, 94.75);
  hops(b, [98, 99]);
  return b.end(106).build();
}
