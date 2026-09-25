import { attackSign } from "../teams";
import { PITCH } from "./tuning";
import type { Athlete, Command, MatchState } from "./types";
import { dist, dot, fromAngle, norm, sub, type Vec2 } from "./vec";

/** A defender this close in front is worth taking on, and no closer than this, or the move runs into them. */
const NEAR = 0.9;
const FAR = 2.8;

/** The defender squarely in the dribbler's way, if any. */
function blocker(state: MatchState, a: Athlete): Athlete | null {
  const facing = fromAngle(a.facing);
  let best: Athlete | null = null;
  for (const o of state.athletes) {
    if (o.team === a.team || o.action === "beaten") continue;
    const d = dist(o.pos, a.pos);
    if (d < NEAR || d > FAR || dot(sub(o.pos, a.pos), facing) < 0.35 * d) continue;
    if (!best || d < dist(best.pos, a.pos)) best = o;
  }
  return best;
}

/**
 * A computer player takes on a defender in its way with a skill move,
 * the better dribblers more often: a rainbow over one standing square,
 * a crossover or elastico away from one to the side, a drag back when
 * pinned against the boards, and a roulette when closed down at an angle.
 */
export function trySkill(state: MatchState, a: Athlete, command: Command): boolean {
  if (a.skill.wait > 0 || a.brain.skillWait > 0) return false;
  const d = blocker(state, a);
  if (!d) return false;
  const rng = state.rng;
  if (!rng.chance(0.2 + 1.2 * (a.dribbling - 0.78))) {
    a.brain.skillWait = 0.6;
    return false;
  }
  const s = attackSign(a.team);
  const rel = sub(d.pos, a.pos);
  const across = rel.z;
  let move: Vec2;
  if (Math.abs(a.pos.z) > PITCH.halfWidth - 2.5 && Math.sign(across) === Math.sign(a.pos.z) && rng.chance(0.5)) {
    move = norm({ x: -s, z: -Math.sign(a.pos.z) * 0.4 });
  } else if (Math.abs(across) < 0.7) {
    const side = Math.abs(a.pos.z) > 2 ? -Math.sign(a.pos.z) : rng.sign();
    move = a.dribbling >= 0.85 && rng.chance(0.35) ? { x: s, z: 0 } : norm({ x: s * 0.3, z: side });
  } else if (rng.chance(0.4)) {
    move = { x: 0, z: 0 };
  } else {
    move = norm({ x: s * 0.3, z: -Math.sign(across) });
  }
  command.move = move;
  command.slide = true;
  a.brain.skillWait = rng.range(1.8, 3.6);
  return true;
}
