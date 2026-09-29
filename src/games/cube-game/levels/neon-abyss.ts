import { LevelBuilder } from "../engine/builder";
import { ballSpikes, ufoGates } from "../engine/placement";
import type { Level, LevelInfo } from "../engine/types";
import { gap, hop, hops, padOrb, platform } from "./patterns";

export const info: LevelInfo = { id: "neon-abyss", name: "Neon Abyss", difficulty: 6, bpm: 144, theme: "neon-abyss" };

/** The ball runs a lower corridor here, so flips come quicker and closer to the spikes. */
const BALL_ROOF = 5;

/**
 * Demon. Faster than anything before it from the first beat, jumps a beat
 * and a quarter apart, and eight changes of form, with the ball and the
 * UFO swapping straight into each other twice.
 */
export function build(): Level {
  const b = new LevelBuilder(info, 11.5);
  hops(b, [8, 9.5, 11]);
  hop(b, 12.25, 2);
  hop(b, 13.5, 3);
  gap(b, 15);
  platform(b, 16.5, 1, 21);
  hop(b, 18, 2, 1);
  hop(b, 19.25, 1, 1);
  b.speed(21, 13);
  padOrb(b, 22, 22.75);

  b.portal(26, "ball", BALL_ROOF);
  b.jump(27, 28.25, 29.5, 30.75, 32, 33.25);
  ballSpikes(b, 27.5, 34, 0.75, BALL_ROOF);
  b.portal(35, "ufo");
  b.jump(36, 37.25, 38.5, 40, 41.25, 42.5, 44, 45.25);
  ufoGates(b, [39.25, 43.25, 46.25], 0.95);
  b.portal(47.5, "cube");

  hops(b, [49, 50.25]);
  hop(b, 51.5, 3);
  b.speed(53, 14.5);
  gap(b, 54);
  hops(b, [55.5, 56.75]);
  padOrb(b, 58, 58.75);

  b.portal(62, "ufo");
  b.jump(63, 64.25, 65.5, 67, 68.25, 69.5, 71);
  ufoGates(b, [66.25, 70.25, 73.25], 0.9);
  b.portal(74.5, "ball", BALL_ROOF);
  b.jump(75.5, 76.75, 78, 79.25, 80.5, 81.75);
  ballSpikes(b, 76, 82.5, 0.75, BALL_ROOF);
  b.portal(83.5, "cube");

  hops(b, [85, 86.25, 87.5]);
  hop(b, 88.75, 2);
  platform(b, 90, 1, 94);
  hop(b, 91.5, 2, 1);
  hop(b, 92.75, 1, 1);
  b.speed(94, 15.5);
  hops(b, [95.5, 96.75]);
  gap(b, 98);
  hop(b, 99.25, 3);

  // One last dive into the ball, with the cube back only for the final jump.
  b.portal(101, "ball", BALL_ROOF);
  b.jump(102, 103.25, 104.5, 105.75);
  ballSpikes(b, 102.5, 106, 0.75, BALL_ROOF);
  b.portal(107, "cube");
  hop(b, 108.5, 2);
  return b.end(116).build();
}
