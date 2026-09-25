import { LevelBuilder } from "../engine/builder";
import { ballSpikes } from "../engine/placement";
import type { Level, LevelInfo } from "../engine/types";
import { gap, hop, hops, padOver, platform } from "./patterns";

export const info: LevelInfo = { id: "sunset-bounce", name: "Sunset Bounce", difficulty: 2, bpm: 116, theme: "sunset-bounce" };

/**
 * Level 2, normal. Spikes every beat or two, a staircase of platforms,
 * then the ball rolling between floor and ceiling.
 */
export function build(): Level {
  const b = new LevelBuilder(info, 9);
  hops(b, [8, 10, 12]);
  hop(b, 14, 2);
  platform(b, 16, 1, 24);
  hop(b, 18, 1, 1);
  hop(b, 20, 2, 1);
  platform(b, 22, 2, 27);
  hop(b, 29);
  padOver(b, 31);

  b.portal(34, "ball");
  b.jump(35, 37, 38, 40, 42, 43, 45, 46);
  ballSpikes(b, 36, 46);
  b.portal(48, "cube");

  hop(b, 51);
  hop(b, 53, 2);
  gap(b, 55);
  hops(b, [57, 59, 60]);
  hop(b, 62, 2);
  padOver(b, 64);
  hop(b, 68);
  hop(b, 70, 2);
  platform(b, 72, 1, 78);
  hop(b, 74, 1, 1);

  b.portal(80, "ball");
  b.jump(81, 83, 84, 86, 88, 89);
  ballSpikes(b, 82, 89);
  b.portal(91, "cube");

  hop(b, 93);
  hop(b, 95, 2);
  padOver(b, 97);
  return b.end(106).build();
}
