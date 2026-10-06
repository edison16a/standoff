import type { Ball } from "../types";
import type { Vec3 } from "../vec";
import { AERO, AIR, BALL_BODY } from "./constants";

const R = BALL_BODY.radius;
/** Half the air's density times the ball's cross section, over its mass: force per Cd per (m/s) squared, per kg. */
const K = (0.5 * AIR.density * Math.PI * R * R) / BALL_BODY.mass;

/**
 * The drag coefficient at a speed. High and steady below the drag
 * crisis, it falls by more than half through it, then creeps back up;
 * a spinning ball drags a little more.
 */
export function dragCoefficient(speed: number, spinRatio = 0): number {
  const crisis = 1 / (1 + Math.exp((speed - AERO.crisisSpeed) / AERO.crisisWidth));
  return AERO.cdFast + (AERO.cdSlow - AERO.cdFast) * crisis + AERO.cdRise * Math.max(0, speed - 18) + AERO.cdSpin * Math.min(spinRatio, 0.5);
}

/** The lift coefficient from the spin ratio, the cover's speed over the ball's: grows, then saturates. */
export function liftCoefficient(spinRatio: number): number {
  return AERO.liftMax * Math.tanh(spinRatio / AERO.liftScale);
}

/**
 * The air's push on a flying ball, as an acceleration written into
 * `out`: drag straight against the motion, Magnus lift along spin
 * crossed with velocity (sidespin curls, topspin dips, backspin floats),
 * and for a ball struck with almost no spin, the knuckleball's slow
 * sideways swim from its uneven wake. The knuckle's swing follows the
 * ball's own path, so it is the same every time for the same strike.
 */
export function airAccel(ball: Ball, out: Vec3): void {
  const v = ball.vel;
  const w = ball.spin;
  const speed = Math.hypot(v.x, v.y, v.z);
  out.x = out.y = out.z = 0;
  if (speed < 1e-6) return;
  // Spin crossed with velocity: its size over the speed is the spin across the flow.
  const cx = w.y * v.z - w.z * v.y;
  const cy = w.z * v.x - w.x * v.z;
  const cz = w.x * v.y - w.y * v.x;
  const cross = Math.hypot(cx, cy, cz);
  const ratio = (R * cross) / (speed * speed);
  const drag = K * dragCoefficient(speed, ratio) * speed;
  out.x = -drag * v.x;
  out.y = -drag * v.y;
  out.z = -drag * v.z;
  if (cross > 1e-9) {
    const lift = (K * liftCoefficient(ratio) * speed * speed) / cross;
    out.x += lift * cx;
    out.y += lift * cy;
    out.z += lift * cz;
  }
  if (ball.wobble !== 0 && speed > AERO.knuckleSpeed) knuckle(ball, speed, ratio, out);
}

function knuckle(ball: Ball, speed: number, ratio: number, out: Vec3): void {
  const calm = 1 - ratio / AERO.knuckleSpin;
  if (calm <= 0) return;
  const v = ball.vel;
  // Two directions across the flight: sideways (velocity crossed with up), and the one between.
  let sx = -v.z;
  let sz = v.x;
  const flat = Math.hypot(sx, sz);
  if (flat < 1e-6) return;
  sx /= flat;
  sz /= flat;
  const ux = (sz * v.y) / speed;
  const uy = (sx * v.z - sz * v.x) / speed;
  const uz = (-sx * v.y) / speed;
  const angle = ball.wobble + (ball.travel / AERO.knuckleWave) * Math.PI * 2;
  const push = K * AERO.knuckleLift * calm * Math.min(1, (speed - AERO.knuckleSpeed) / 6) * speed * speed;
  const c = Math.cos(angle) * push;
  const s = Math.sin(angle) * push;
  out.x += c * sx + s * ux;
  out.y += s * uy;
  out.z += c * sz + s * uz;
}

/** Air friction on the cover slows the spin. */
export function decaySpin(ball: Ball, h: number, rate: number = AERO.spinDecay): void {
  const k = Math.exp(-rate * h);
  ball.spin.x *= k;
  ball.spin.y *= k;
  ball.spin.z *= k;
}
