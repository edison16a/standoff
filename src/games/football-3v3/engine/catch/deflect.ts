import type { Flight } from "../flight";
import { support } from "../physics/ball-shape";
import { applyImpulse, collide } from "../physics/contact";
import type { Rng } from "../rng";
import type { Athlete } from "../types";
import { norm3, type V3 } from "../vec";

/**
 * A ball off a pair of hands that did not hold it: a real collision with
 * the hands, which move with the player and push into the ball. A drop
 * pops off soft hands, up and spinning; a swat is a hard slap down and
 * away. Either way the ball flies on with the physics and anyone near
 * can still catch the tip.
 */
export const HAND_HIT = {
  bobble: { restitution: 0.3, friction: 0.5, pop: [1.2, 3] as const },
  swat: { restitution: 0.5, friction: 0.6, slap: [4, 7] as const },
} as const;

/** Unit direction from the hand to the ball; the ball's own backward path if they coincide. */
function awayFrom(hand: V3, ball: V3, vel: V3): V3 {
  const d = { x: ball.x - hand.x, y: ball.y - hand.y, z: ball.z - hand.z };
  if (Math.hypot(d.x, d.y, d.z) > 0.02) return norm3(d);
  return norm3({ x: -vel.x, y: -vel.y, z: -vel.z });
}

/** A random off centre push, so no two tips spin the same way. */
function knock(f: Flight, n: V3, rng: Rng, push: V3): void {
  const r = support(f.q, { x: -n.x + rng.range(-0.5, 0.5), y: -n.y + rng.range(-0.5, 0.5), z: -n.z + rng.range(-0.5, 0.5) });
  applyImpulse(f, r, push);
}

/** The ball comes off hands that could not hold it. `hand` is where the hands met it. */
export function bobble(f: Flight, a: Athlete, hand: V3, rng: Rng): void {
  const n = awayFrom(hand, f.pos, f.vel);
  const B = HAND_HIT.bobble;
  collide(f, support(f.q, { x: -n.x, y: -n.y, z: -n.z }), { n, vel: { x: a.vx, y: 0, z: a.vz }, restitution: B.restitution, friction: B.friction });
  const up = rng.range(B.pop[0], B.pop[1]) * 0.42;
  knock(f, n, rng, { x: n.x * 0.15, y: up, z: n.z * 0.15 });
}

/** A defender slaps the ball down and away from the receiver. */
export function swat(f: Flight, a: Athlete, hand: V3, rng: Rng): void {
  const n = awayFrom(hand, f.pos, f.vel);
  const S = HAND_HIT.swat;
  collide(f, support(f.q, { x: -n.x, y: -n.y, z: -n.z }), { n, vel: { x: a.vx, y: 0, z: a.vz }, restitution: S.restitution, friction: S.friction });
  const slap = rng.range(S.slap[0], S.slap[1]) * 0.42;
  const flat = norm3({ x: n.x, y: 0, z: n.z });
  knock(f, n, rng, { x: flat.x * slap * 0.5, y: -slap, z: flat.z * slap * 0.5 });
}
