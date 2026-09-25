import { LevelBuilder } from "../engine/builder";
import { ballSpikes, ufoGates } from "../engine/placement";
import type { Level, LevelInfo } from "../engine/types";
import { gap, hop, hops, padOrb, platform } from "./patterns";

export const info: LevelInfo = { id: "core-meltdown", name: "Core Meltdown", difficulty: 5, bpm: 136, theme: "core-meltdown" };

/**
 * Level 5, the hardest. Fast from the start and faster twice, tight UFO
 * gates straight into the ball, and a last cube run on the edge of the beat.
 */
export function build(): Level {
  const b = new LevelBuilder(info, 10.5);
  hops(b, [8, 9.5, 11]);
  hop(b, 12.5, 2);
  gap(b, 14);
  hop(b, 15.5);
  platform(b, 17, 1, 22);
  hop(b, 19, 2, 1);
  b.speed(22, 12.5);
  padOrb(b, 23, 23.75);

  b.portal(27, "ufo");
  b.jump(28, 29, 30, 31, 33, 34, 35, 37, 38, 39, 41);
  ufoGates(b, [32, 36, 40], 1.0);
  b.portal(43, "ball");
  b.jump(45, 46, 48, 49, 50, 52, 53, 54);
  ballSpikes(b, 46, 54);
  b.speed(56, 13.5);
  b.portal(56, "cube");

  hops(b, [59, 60.5]);
  hop(b, 62, 2);
  gap(b, 63.5);
  padOrb(b, 66, 66.75);
  hops(b, [70, 71.5]);
  hop(b, 73, 2);
  return b.end(82).build();
}
