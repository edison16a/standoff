import type { MatchView } from "../../engine/view";

/** How loud and bouncy the crowd is: a hum, rising as the ball nears a goal, and wild for goals. */
export function excitement(view: MatchView): number {
  if (view.phase === "goal") return 1;
  if (view.phase === "fulltime") return 0.9;
  const nearGoal = Math.max(0, (Math.abs(view.ball.x) - 8) / 8);
  return 0.12 + 0.35 * nearGoal;
}
