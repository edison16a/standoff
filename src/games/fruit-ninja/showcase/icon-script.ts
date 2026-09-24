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
 * Key art for the store tile: a watermelon cut in two by a blazing blade,
 * with a glowing dragonfruit and more fruit hanging around it, all in the
 * top of a square frame so the logo has room below.
 */
export const ICON: Script = {
  period: 30,
  throws: [
    hang("melon", "watermelon", -0.2, 1.9, 0.6),
    hang("dragon", "dragonfruit", 2.5, 3.2, -1),
    hang("orange", "orange", -3.1, 3.4, 1),
    hang("berry", "strawberry", -3.1, 0.5, 0.5),
    hang("pineapple", "pineapple", 3, 0.9, -0.5),
    hang("lime", "lime", 0.2, 4, 0.4),
  ],
  bots: [
    {
      seat: 1,
      name: "",
      blade: "fire",
      moves: [rest(1.6, -4, 4.2), slash(ICON_AT - 0.09, "melon", -30, 2.4, 0.1), rest(5, 3, -3)],
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
