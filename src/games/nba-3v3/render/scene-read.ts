import type { Match } from "../engine/match";
import type { Athlete } from "../engine/types";
import { dist2 } from "../engine/vec";
import type { LaneStance } from "./anim/line";
import { freeThrowShot } from "./free-throw-camera";
import type { Shot } from "./tv-camera";

/** How close the nearest defender is to the ball handler, 0 (free) to 1 (right on them). */
export function pressureOn(m: Match, holder: Athlete): number {
  let near = Infinity;
  for (const o of m.opponents(holder.team)) near = Math.min(near, dist2(o, holder));
  return Math.max(0, Math.min(1, (2.2 - near) / 1.2));
}

/**
 * The free throw routine as a player's body shows it: the fouler's hand
 * up at the whistle, then the lane resting between shots and ready to
 * box out once the shot goes up.
 */
export function lineScene(m: Match, a: Athlete): { lane: LaneStance | null; fouled: number } {
  const ft = m.phase === "freeThrow" ? m.freeThrows : null;
  if (!ft || a.id === ft.shooter) return { lane: null, fouled: 0 };
  const fouled = a.id === ft.fouler && ft.stage === "whistle" ? Math.min(1, ft.t / 0.15) * Math.min(1, (0.9 - ft.t) / 0.2 + 0.3) : 0;
  if (ft.stage === "set" || ft.stage === "result" || ft.stage === "return") return { lane: "rest", fouled };
  if (ft.stage === "shooting") return { lane: "ready", fouled };
  return { lane: null, fouled };
}

/** What the broadcast camera should frame: the ball, a dunker, the winners, the opening sweep or the free throw line. */
export function broadcastShot(m: Match, intro: number | null): Shot {
  const dunker = m.athletes.find((a) => a.action.kind === "drive" && a.action.dunk && a.action.t > a.action.takeoff * 0.5);
  let winners: Shot["winners"] = null;
  if (m.phase === "over" && m.winner !== null && m.phaseT > 1.5) {
    const side = m.athletes.filter((a) => a.team === m.winner);
    winners = { x: side.reduce((s, a) => s + a.x, 0) / side.length, z: side.reduce((s, a) => s + a.z, 0) / side.length };
  }
  return { focus: m.ball.pos, dunker: dunker ? { x: dunker.x, z: dunker.z } : null, winners, intro, freeThrow: freeThrowShot(m) };
}
