import type { PassInfo } from "../ball";
import { isDown } from "../body";
import type { Match } from "../match";
import type { Athlete } from "../types";

/** What a player may do with a pass: catch it, pick it off, or (a computer defender) only knock it down. */
export type Play = "catch" | "pick" | "swat";

/** What `a` may do with this pass, or null when it is not his to play. */
export function playFor(m: Match, a: Athlete, pass: PassInfo): Play | null {
  if (a.role === "lineman" || isDown(a) || a.id === pass.from) return null;
  const thrower = m.athlete(pass.from);
  if (a.team === thrower?.team) return a.role === "runner" && (!pass.pitch || a.id === pass.to) ? "catch" : null;
  // Nobody picks off a pitch, and a defender on Guard only tails his man.
  if (pass.pitch || a.guard !== null) return null;
  // A clean ball is only the lane's to play (pass-lane.ts); once knocked about it is anyone's.
  if (!pass.tipped && !(a.id in pass.lane)) return null;
  return !a.auto || a.id === pass.interceptor ? "pick" : "swat";
}

