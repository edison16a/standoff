import { buildOf, standingReach } from "./athlete";
import { carry } from "./ball-carry";
import { freeBall } from "./ball-flight";
import { dribbleBall } from "./dribble-ball";
import type { Match } from "./match";
import { JUMPER } from "./shooting";
import { clamp, lerp } from "./vec";

/**
 * The ball, every step: in a hand (dribbling, or up for a shot), or
 * free under the physics (a shot, a pass, a rebound, a loose ball)
 * until someone takes it. The physics is the same in every case, so a
 * pass, a shot and a scramble all fly, spin and bounce alike.
 */
export function updateBall(m: Match, dt: number): void {
  const b = m.ball;
  b.rimCd = Math.max(0, b.rimCd - dt);
  b.impact.age += dt;
  if (b.mode === "held") return holdBall(m, dt);
  b.flightT += dt;
  b.hand = "none";
  freeBall(m, dt);
}

function holdBall(m: Match, dt: number): void {
  const b = m.ball;
  const a = m.holder;
  if (!a) {
    b.mode = "loose";
    b.hand = "none";
    return;
  }
  const act = a.action;
  if (act.kind !== "shoot" && act.kind !== "drive") return dribbleBall(m, a, dt);
  // Both hands bring it up: to the set point for a jumper, to full stretch at the rim.
  const h = buildOf(a).body.height;
  const lift = act.kind === "shoot" ? clamp(act.t / JUMPER.takeoff, 0, 1) : clamp(act.t / act.finish, 0, 1);
  const top = act.kind === "shoot" ? h * 1.12 : standingReach(a) - 0.12;
  const fwd = act.kind === "shoot" ? 0.2 : 0.3;
  const to = { x: a.x + Math.sin(a.yaw) * fwd, y: a.y + lerp(h * 0.62, top, lift), z: a.z + Math.cos(a.yaw) * fwd };
  carry(m, to, dt);
}
