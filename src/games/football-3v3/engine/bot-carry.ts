import { attackSign } from "../teams";
import { isDown } from "./athlete";
import { botSkill } from "./bot-skill";
import { canDive } from "./dive";
import { FIELD, yardsToGoal } from "./field";
import { canJuke } from "./juke";
import type { Athlete, Command, MatchState } from "./types";
import { add, clampLen, dist, dot, len, norm, perp, scale, sub, v2, type Vec2 } from "./vec";

/** Defenders further than this do not bend a carrier's run. */
const SEE = 7;

/**
 * A computer ball carrier: heads for the end zone, bending away from
 * defenders ahead and off the sideline, jukes a defender about to hit
 * him, and dives for the goal line when it is close and someone is on him.
 */
export function carryCommand(state: MatchState, a: Athlete): Command {
  const s = attackSign(a.team);
  let want: Vec2 = v2(s, 0);
  let nearest: Athlete | null = null;
  for (const d of state.athletes) {
    if (d.team === a.team || isDown(d)) continue;
    const rel = sub(a.pos, d.pos);
    const gap = len(rel);
    if (!nearest || gap < dist(nearest.pos, a.pos)) nearest = d;
    if (gap > SEE) continue;
    // Defenders ahead push the run away hardest; ones behind barely matter.
    const ahead = dot(norm(rel), v2(-s, 0)) > -0.2 ? 1 : 0.35;
    want = add(want, norm(rel), ahead * ((SEE - gap) / SEE) ** 2 * 1.8);
  }
  const edge = FIELD.halfWidth - 3;
  if (Math.abs(a.pos.z) > edge) want = add(want, v2(0, -Math.sign(a.pos.z)), (Math.abs(a.pos.z) - edge) / 2);
  const cmd: Command = { move: clampLen(norm(want), 1) };
  if (!nearest || !botSkill(state).acts) return cmd;
  const gap = dist(nearest.pos, a.pos);
  const toGoal = yardsToGoal(a.team, a.pos.x);
  if (toGoal < 2.5 && toGoal > 0 && gap < 3 && canDive(a)) return { move: v2(s, 0), dive: true };
  const lunging = nearest.action === "lunge" || gap < 2.2;
  if (!lunging || !canJuke(a) || a.brain.thinkIn > 0) return cmd;
  // A read a few times a second; sharper bots see the hit coming more often.
  a.brain.thinkIn = 0.3;
  if (state.rng.chance(0.1 + 0.3 * botSkill(state).accuracy)) {
    const away = norm(sub(a.pos, nearest.pos));
    const side = dot(perp(v2(s, 0)), away) >= 0 ? 1 : -1;
    cmd.juke = true;
    cmd.move = state.rng.chance(0.3) ? v2() : scale(perp(v2(s, 0)), side);
  }
  return cmd;
}
