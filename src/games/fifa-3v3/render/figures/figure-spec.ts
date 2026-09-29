import { BUILDS, type BuildId } from "../../builds";
import type { Celebration, Look } from "../../looks";

/**
 * Who a figure on the pitch is: the body, the name and number on the
 * back of the shirt, the stronger foot and the goal celebration. A
 * player's build gives all but the name, which is their own.
 */
export interface FigureSpec {
  look: Look;
  /** Printed on the back of the shirt. Empty for none. */
  name: string;
  /** 0 is a plain shirt with nothing printed, like the referee's. */
  number: number;
  foot: "left" | "right";
  celebration: Celebration;
}

export function figureOf(build: BuildId, name: string): FigureSpec {
  const b = BUILDS[build];
  return { look: b.look, name, number: b.number, foot: b.foot, celebration: b.celebration };
}
