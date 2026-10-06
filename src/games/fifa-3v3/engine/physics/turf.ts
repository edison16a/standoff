import type { Ball } from "../types";
import { AIR, BALL_BODY, TURF } from "./constants";
import { impact } from "./impulse";

const R = BALL_BODY.radius;
const ALPHA = BALL_BODY.inertia;
const UP = { x: 0, y: 1, z: 0 };

/** Bounce restitution on grass for a ball landing at `speed` into the turf. */
export function turfRestitution(speed: number): number {
  return Math.max(TURF.restMin, Math.min(TURF.restSlow, TURF.restSlow - TURF.restDrop * speed));
}

/**
 * A ball landing on the grass. Fast enough, it bounces: restitution by
 * how hard it landed, and the turf's friction trading slip for spin
 * (see impulse.ts). Too slow, the bounce dies and it settles into a
 * roll. Returns the landing speed when it bounced, else 0.
 */
export function landOnTurf(ball: Ball): number {
  ball.pos.y = R;
  const into = -ball.vel.y;
  if (into <= 0) return 0;
  if (into < TURF.settle) {
    ball.vel.y = 0;
    return 0;
  }
  return impact(ball, { n: UP, restitution: turfRestitution(into), friction: TURF.friction });
}

/** The contact point's slip over the grass: the ball's travel plus the sweep of its spin at the bottom. */
export function slipOf(ball: Ball): { x: number; z: number } {
  return { x: ball.vel.x + ball.spin.z * R, z: ball.vel.z - ball.spin.x * R };
}

/**
 * One substep of a ball on the turf. A ball struck flat skids: sliding
 * friction slows it and spins it up until the bottom of the ball stops
 * slipping, which costs a thin shell two fifths of its pace. From then
 * on it rolls, slowed by rolling resistance and the grass blades, and
 * its spin follows its travel. Sidespin is scrubbed off by the turf.
 */
export function rollOnTurf(ball: Ball, h: number): void {
  const v = ball.vel;
  const w = ball.spin;
  ball.pos.y = R;
  v.y = 0;
  const slip = slipOf(ball);
  const s = Math.hypot(slip.x, slip.z);
  // How fast sliding friction closes the slip: the pace lost plus the spin gained.
  const closing = TURF.friction * AIR.gravity * (1 + 1 / ALPHA) * h;
  if (s > closing) {
    const a = TURF.friction * AIR.gravity * h;
    const ux = slip.x / s;
    const uz = slip.z / s;
    v.x -= a * ux;
    v.z -= a * uz;
    // The friction at the bottom of the ball spins it: dw = r x F / I with r straight down.
    w.x += (a * uz) / (ALPHA * R);
    w.z -= (a * ux) / (ALPHA * R);
  } else {
    // Rolling: the slip that is left is taken out exactly, then the roll slows.
    const j = ALPHA / (1 + ALPHA);
    v.x -= slip.x * j;
    v.z -= slip.z * j;
    const speed = Math.hypot(v.x, v.z);
    if (speed > 1e-6) {
      const next = Math.max(0, speed - (TURF.rolling * AIR.gravity + TURF.grassDrag * speed) * h);
      v.x *= next / speed;
      v.z *= next / speed;
    }
    w.x = v.z / R;
    w.z = -v.x / R;
  }
  w.y *= Math.exp(-TURF.spinScrub * h);
}

/** Whether the ball is sitting on the grass, rolling or still, rather than in the air. */
export function onTurf(ball: Ball): boolean {
  return ball.pos.y <= R + 1e-4 && ball.vel.y <= 1e-3;
}
