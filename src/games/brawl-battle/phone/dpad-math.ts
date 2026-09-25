import type { Stick } from "@/games/kit/pad/stick-math";

const DIAGONAL = Math.SQRT1_2;
/** tan(22.5 degrees): the edge between a straight direction and a diagonal. */
const SLOPE = Math.tan(Math.PI / 8);

/**
 * Where a thumb on the direction pad points, as an eight way stick. The
 * offset is from the pad's centre in CSS pixels, y down as on screen;
 * inside `dead` it is centred. Diagonals are full length, so up and
 * right together still jumps.
 */
export function dpadStick(dx: number, dy: number, dead: number): Stick {
  if (Math.hypot(dx, dy) < dead) return { x: 0, y: 0 };
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const x = ax > ay * SLOPE ? Math.sign(dx) : 0;
  const y = ay > ax * SLOPE ? -Math.sign(dy) : 0;
  if (x !== 0 && y !== 0) return { x: x * DIAGONAL, y: y * DIAGONAL };
  return { x, y };
}
