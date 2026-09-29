import type { Match } from "./match";
import { RIM } from "./tuning";
import type { Athlete } from "./types";
import type { V2 } from "./vec";

/** What a standing player looks at: the rim with the ball, the ball on defence. */
export function facingFor(m: Match, a: Athlete): V2 | null {
  const check = m.phase === "check" ? m.checkUp : null;
  if (check) {
    // In the check the two at the top face each other and everyone else watches the ball.
    const other = a.id === check.plan.checker ? check.plan.defender : a.id === check.plan.defender ? check.plan.checker : null;
    if (other !== null) return m.athletes[other]!;
    return { x: m.ball.pos.x, z: m.ball.pos.z };
  }
  if (Math.hypot(a.vx, a.vz) > 1.2 && a.action.kind === "none") return null;
  // At the free throws everyone watches the shooter and the rim.
  if (m.phase === "freeThrow") return { x: RIM.x, z: RIM.z };
  if (a.action.kind === "shoot" || a.action.kind === "drive") return { x: RIM.x, z: RIM.z };
  if (m.ball.holder === a.id) return { x: RIM.x, z: RIM.z };
  if (a.team !== m.offence || m.ball.mode !== "held") return { x: m.ball.pos.x, z: m.ball.pos.z };
  return null;
}
