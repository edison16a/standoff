import type { MatchPhase } from "../engine/match";
import type { FighterId } from "../engine/types";

/** A part of the screen, as shares of its width and height from the top left. */
export interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const FULL: ViewRect = { x: 0, y: 0, w: 1, h: 1 };
export const LEFT: ViewRect = { x: 0, y: 0, w: 0.5, h: 1 };
export const RIGHT: ViewRect = { x: 0.5, y: 0, w: 0.5, h: 1 };

/** Where the fight is, as far as the cameras care. */
export type Shot = "menu" | "fight" | "replay" | "celebrate";

/** One player's own view over their boxer's shoulder, and where it sits on screen. */
export interface OwnView {
  id: FighterId;
  rect: ViewRect;
}

/**
 * The players' own views on screen right now. None while the broadcast
 * camera has the whole screen: the menus, the walk out, the breaks, the
 * replay and the winner. Otherwise one wide view for one player, or the
 * screen split down the middle for two. No three.js here, so the overlay
 * can lay itself out from the very same rects the picture is drawn in.
 */
export function ownViews(shot: Shot, phase: MatchPhase, humans: readonly [boolean, boolean]): OwnView[] {
  if (shot !== "fight" || phase === "over" || phase === "intro" || phase === "break") return [];
  const ids = ([0, 1] as const).filter((id) => humans[id]);
  return ids.map((id) => ({ id, rect: ids.length === 1 ? FULL : id === 0 ? LEFT : RIGHT }));
}
