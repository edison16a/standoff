import { LevelBuilder } from "../engine/builder";
import { ballSpikes, ufoGates } from "../engine/placement";
import type { Level, LevelInfo } from "../engine/types";
import { gap, hop, hops, padOrb, padOver, platform } from "./patterns";

export const info: LevelInfo = { id: "circuit-rush", name: "Circuit Rush", difficulty: 4, bpm: 128, theme: "circuit-rush" };

/**
 * Level 4, harder. A speed gate halfway through the cube part, then the
 * ball and the UFO back to back before the cube comes home.
 */
export function build(): Level {
  const b = new LevelBuilder(info, 10);
  hops(b, [8, 9]);
  hop(b, 10, 2);
  gap(b, 12);
  hops(b, [14, 15, 16]);
  platform(b, 18, 1, 23);
  hop(b, 20, 2, 1);
  b.speed(24, 11.5);
  padOver(b, 25);

  b.portal(28, "ball");
  b.jump(29, 30, 32, 33, 34, 36, 37, 39);
  ballSpikes(b, 30, 40);
  b.portal(42, "ufo");
  b.jump(43, 44, 45, 46, 48, 49, 51, 52, 53, 55);
  ufoGates(b, [47, 50, 54], 1.15);
  b.portal(57, "cube");

  hops(b, [60, 61]);
  gap(b, 63);
  hop(b, 65, 2);
  padOrb(b, 67, 67.75);
  hops(b, [71, 72, 73]);
  return b.end(80).build();
}
