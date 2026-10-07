import { buildOf } from "./athlete";
import { carry } from "./ball-carry";
import { freeBall } from "./ball-flight";
import { dribbleBall } from "./dribble-ball";
import { ballInHands } from "./finish/ball-track";
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
  // At the rim the preset's own path through the hands carries it.
  if (act.kind === "drive") return carry(m, ballInHands(a, act, { x: 0, y: 0, z: 0 }), dt);
  if (act.kind !== "shoot") return dribbleBall(m, a, dt);
  // Both hands bring it up to the set point for a jumper.
  const h = buildOf(a).body.height;
  const lift = clamp(act.t / JUMPER.takeoff, 0, 1);
  const to = { x: a.x + Math.sin(a.yaw) * 0.2, y: a.y + lerp(h * 0.62, h * 1.12, lift), z: a.z + Math.cos(a.yaw) * 0.2 };
  carry(m, to, dt);
}
