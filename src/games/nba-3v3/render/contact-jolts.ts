import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import type { AthleteView } from "./athlete-view";

/** Players who collide hard are each jolted away from the other, as hard as the hit; a hand on the ball in the air reaches for it. */
export function joltOnContact(event: MatchEvent, m: Match, views: readonly AthleteView[]): void {
  if (event.type === "block") views[event.id]?.touched({ at: event.at, tip: event.tip }, m.ball.vel);
  if (event.type === "tip") views[event.id]?.touched({ at: event.at, tip: true }, m.ball.vel);
  if (event.type !== "bump") return;
  const a = m.athletes[event.a];
  const b = m.athletes[event.b];
  if (!a || !b) return;
  views[event.a]?.hit(a.x - b.x, a.z - b.z, event.power);
  views[event.b]?.hit(b.x - a.x, b.z - a.z, event.power);
}
