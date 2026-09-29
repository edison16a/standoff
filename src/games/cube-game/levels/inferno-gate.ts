import { LevelBuilder } from "../engine/builder";
import { ballSpikes, ufoGates } from "../engine/placement";
import type { Level, LevelInfo } from "../engine/types";
import { gap, hop, hops, padOrb, platform } from "./patterns";

export const info: LevelInfo = { id: "inferno-gate", name: "Inferno Gate", difficulty: 6, bpm: 150, theme: "inferno-gate" };

/** A lower ball corridor than Neon Abyss, so each flip is a snap. */
const BALL_ROOF = 4.6;

/**
 * Demon, the last level. The quickest song, the fastest run, jumps half
 * a second apart, the narrowest UFO gates, and nine changes of form,
 * with the ball and the UFO meeting head on three times.
 */
export function build(): Level {
  const b = new LevelBuilder(info, 12.5);
  hops(b, [8, 9.25, 10.5]);
  hop(b, 11.75, 3);
  gap(b, 13.25);
  hops(b, [14.5, 15.75]);
  platform(b, 17, 1, 21);
  hop(b, 18.25, 2, 1);
  hop(b, 19.5, 2, 1);
  b.speed(21, 14);
  padOrb(b, 22, 22.75);

  b.portal(26, "ufo");
  b.jump(27, 28.25, 29.5, 31, 32.25, 33.5, 35);
  ufoGates(b, [30.25, 34.25, 36.5], 0.85);
  b.portal(38, "ball", BALL_ROOF);
  b.jump(39, 40.25, 41.5, 42.75, 44, 45.25);
  ballSpikes(b, 39.5, 46, 0.75, BALL_ROOF);
  b.portal(48, "cube");

  hops(b, [49.5, 50.75, 52]);
  hop(b, 53.25, 3);
  b.speed(54.5, 15.5);
  gap(b, 55.5);
  hops(b, [56.75, 58]);
  padOrb(b, 59.25, 60);

  b.portal(63, "ball", BALL_ROOF);
  b.jump(64, 65.25, 66.5, 67.75, 69, 70.25);
  ballSpikes(b, 64.5, 71, 0.75, BALL_ROOF);
  b.portal(72, "ufo");
  b.jump(73, 74.25, 75.5, 77, 78.25, 79.5, 81);
  ufoGates(b, [76.25, 80.25, 82.5], 0.85);
  b.portal(84, "cube");

  b.speed(86, 16.5);
  hops(b, [87, 88.25, 89.5]);
  hop(b, 90.75, 3);
  platform(b, 92, 1, 96);
  hop(b, 93.25, 2, 1);
  hop(b, 94.5, 2, 1);
  gap(b, 96.5);
  hops(b, [97.75, 99]);
  hop(b, 100.25, 3);

  // The gauntlet: UFO, ball and cube again at the top speed, one after another.
  b.portal(102, "ufo");
  b.jump(103, 104.25, 105.5);
  ufoGates(b, [106.5], 0.85);
  b.portal(108, "ball", BALL_ROOF);
  b.jump(109, 110.25, 111.5, 112.75);
  ballSpikes(b, 109.5, 113, 0.75, BALL_ROOF);
  b.portal(114, "cube");
  hop(b, 115.5, 2);
  return b.end(122).build();
}
