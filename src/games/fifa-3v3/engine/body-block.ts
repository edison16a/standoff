import { ROSTER } from "../roster";
import { JUMP } from "./defence-tuning";
import { jumpLift } from "./jump";
import { BALL } from "./tuning";
import type { Athlete, Ball, MatchState } from "./types";

/** A body soaks up most of the ball's pace: the bounce off a chest or a thigh is soft. */
const RESTITUTION = 0.32;
const GRIP = 0.7;

/** The part of the body that blocks, as a column: from just over the boots to the top of the reach. */
export interface Column {
  x: number;
  z: number;
  bottom: number;
  top: number;
  radius: number;
}

/** A blocking player's body at this moment. Only a jumping player or a wall blocks this way. */
export function blockColumn(a: Athlete): Column | null {
  if (a.action !== "jump" && a.action !== "wall") return null;
  const lift = a.action === "jump" ? jumpLift(a.actionT) : 0;
  const height = ROSTER[a.character].look.height;
  // Arms go up in a jump; in the wall they stay down in front.
  const reach = a.action === "jump" ? JUMP.reach : 0;
  return { x: a.pos.x, z: a.pos.z, bottom: lift + 0.12, top: lift + height + reach, radius: JUMP.radius };
}

/**
 * Where the ball touches a column, as the outward normal, or null when
 * it does not. The column is a capsule: rounded at both ends.
 */
export function touch(c: Column, p: { x: number; y: number; z: number }): { nx: number; ny: number; nz: number; depth: number } | null {
  const cy = Math.max(c.bottom, Math.min(c.top, p.y));
  const dx = p.x - c.x;
  const dy = p.y - cy;
  const dz = p.z - c.z;
  const d = Math.hypot(dx, dy, dz);
  const min = c.radius + BALL.radius;
  if (d >= min || d < 1e-6) return null;
  return { nx: dx / d, ny: dy / d, nz: dz / d, depth: min - d };
}

/** Bounces the ball off a column: most of the pace goes, the rest glances away along the body. */
export function deflect(ball: Ball, n: { nx: number; ny: number; nz: number; depth: number }, jiggle: number): number {
  const v = ball.vel;
  const vn = v.x * n.nx + v.y * n.ny + v.z * n.nz;
  ball.pos.x += n.nx * n.depth;
  ball.pos.y += n.ny * n.depth;
  ball.pos.z += n.nz * n.depth;
  if (vn >= 0) return 0;
  v.x = (v.x - vn * n.nx) * GRIP - vn * RESTITUTION * n.nx;
  v.y = (v.y - vn * n.ny) * GRIP - vn * RESTITUTION * n.ny;
  v.z = (v.z - vn * n.nz) * GRIP - vn * RESTITUTION * n.nz + jiggle;
  // Spin is mostly killed by the body; a little turns the ball over.
  ball.spin.x *= 0.2;
  ball.spin.y *= -0.2;
  ball.spin.z *= 0.2;
  return -vn;
}

/**
 * A loose ball against the bodies of players who are blocking. A shot
 * that hits one is over: its planned outcome no longer holds.
 */
export function blockBall(state: MatchState): void {
  const ball = state.ball;
  if (ball.owner || ball.inGoal !== null) return;
  for (const a of state.athletes) {
    // Nobody blocks their own side's ball.
    if (ball.lastTouch?.team === a.team) continue;
    const column = blockColumn(a);
    if (!column) continue;
    const hit = touch(column, ball.pos);
    if (!hit) continue;
    const speed = deflect(ball, hit, state.rng.range(-0.6, 0.6));
    if (speed < 0.5) continue;
    ball.lastTouch = { team: a.team, id: a.id };
    ball.passTo = null;
    const flight = state.flight;
    if (flight && !flight.resolved) {
      flight.resolved = true;
      flight.outcome = "blocked";
    }
    state.events.push({ type: "block", athlete: a.id, speed, at: { ...ball.pos } });
    return;
  }
}
