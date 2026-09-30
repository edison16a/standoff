import { KINDS, type BodyKind } from "../engine/fruit-kinds";
import { GRAVITY, HALF_HEIGHT } from "../engine/tuning";
import { rest, slash, type Script, type Throw } from "./script";

/** The moment the tile shows. */
export const ICON_AT = 3;

/** A throw timed to hang at its peak, at (x, y), at the tile's moment. `lean` tips it sideways. */
function hang(id: string, kind: BodyKind, x: number, y: number, lean = 0): Throw {
  const vy = Math.sqrt(2 * GRAVITY * (y + HALF_HEIGHT + KINDS[kind].radius + 0.3));
  return { id, t: ICON_AT - vy / GRAVITY, kind, from: x - lean, apex: { x, y } };
}

/**
 * Key art for the store tile, built like a game cover: one hero, the
 * watermelon, big in the middle and cut in two by a blazing blade, with
 * a glowing dragonfruit and more fruit hanging round it as a frame, all
 * in the top of a square picture so the logo has room below.
 */
export const ICON: Script = {
  period: 30,
  throws: [
    hang("melon", "watermelon", -0.1, 2.25, 0.6),
    hang("dragon", "dragonfruit", 1.95, 3.15, -1),
    hang("orange", "orange", -2.05, 3.3, 1),
    hang("berry", "strawberry", -2.45, 0.9, 0.5),
    hang("pineapple", "pineapple", 2.5, 0.85, -0.5),
    hang("lime", "lime", 0.85, 3.8, 0.4),
  ],
  bots: [
    {
      seat: 1,
      name: "",
      blade: "fire",
      moves: [rest(1.6, -4, 4.2), slash(ICON_AT - 0.15, "melon", -24, 1.9, 0.1), rest(5, 3, -3)],
    },
    {
      // A moment earlier another blade opened the orange, so its halves and juice have spread.
      seat: 2,
      name: "",
      blade: "lightning",
      moves: [rest(1.6, -4.5, -1), slash(ICON_AT - 0.3, "orange", 70, 1.6, 0.08), rest(5, -4, 5)],
    },
  ],
};
