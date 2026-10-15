import type { Match } from "../match";
import type { Athlete } from "../types";

/**
 * On a pass play from the playbook, running a route the card drew: a
 * wing given one is a receiver like the runners for the throw stick and
 * the hands, and no blocker while he runs it.
 */
export function onPlayRoute(m: Match, a: Athlete): boolean {
  const play = m.play;
  if (!play?.design || play.design.call !== "throw") return false;
  const at = play.runners.indexOf(a.id);
  return at >= 0 && play.design.routes[at] !== "block";
}
