import { attackSign } from "../teams";
import { newBall, stepBall, type Contact } from "./ball";
import { rollDistance, rollSpeedFor, rollTime } from "./physics/roll-table";
import { BALL, PASS, STEP } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { dist, dot, len, norm, sub, type Vec2, type Vec3 } from "./vec";

/** Metres to the nearest opponent, capped: how free a player is to receive. */
export function openness(state: MatchState, a: Athlete, at: Vec2 = a.pos): number {
  let nearest = 6;
  for (const o of state.athletes) if (o.team !== a.team) nearest = Math.min(nearest, dist(o.pos, at));
  return nearest;
}

/**
 * Who a pass goes to. With the stick pushed, the team mate most in that
 * direction, within a cone. With the stick centred, the most open team
 * mate, leaning toward those further up the pitch.
 */
export function choosePassTarget(state: MatchState, a: Athlete, aim: Vec2 | null): Athlete | null {
  const forward = attackSign(a.team);
  let best: Athlete | null = null;
  let bestScore = -Infinity;
  const pushed = aim && len(aim) > 0.3 ? norm(aim) : null;
  for (const m of state.athletes) {
    if (m.team !== a.team || m.id === a.id) continue;
    const to = sub(m.pos, a.pos);
    const d = len(to);
    if (d < 1.2) continue;
    let score: number;
    if (pushed) {
      const cos = dot(norm(to), pushed);
      if (cos < Math.cos(PASS.cone)) continue;
      score = cos * 3 - d * 0.04 + openness(state, m) * 0.15;
    } else {
      score = openness(state, m) * 0.5 + ((m.pos.x - a.pos.x) * forward) * 0.12 - d * 0.05;
    }
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

/**
 * A ground pass that reaches `to` at a comfortable pace, however far.
 * It is struck through the top half, so it rolls true from the boot,
 * and the turf and the air slow it as they really do: the pace off the
 * boot is read from the roll the match's own physics makes.
 */
export function passVelocity(from: Vec3, to: Vec2, arrive: number = PASS.arrive): Vec3 {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const d = Math.max(0.1, Math.hypot(dx, dz));
  const speed = Math.min(PASS.maxSpeed, rollSpeedFor(d, arrive));
  return { x: (dx / d) * speed, y: 0, z: (dz / d) * speed };
}

/** The topspin of a ball rolling true along `vel`, so it leaves the boot rolling rather than skidding. */
export function rollingSpin(vel: Vec3): Vec3 {
  return { x: vel.z / BALL.radius, y: 0, z: -vel.x / BALL.radius };
}

/** Seconds a ground pass struck at `speed` takes to roll `distance`. */
export function rollArrival(speed: number, distance: number): number {
  const left = rollDistance(speed);
  if (distance >= left) return rollTime(speed) + 5;
  // Find the pace left at that distance by bisection, then the time to it.
  let lo = 0;
  let hi = speed;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (rollDistance(speed, mid) < distance) hi = mid;
    else lo = mid;
  }
  return rollTime(speed, (lo + hi) / 2);
}

/**
 * Where to send it so a running receiver meets it: their spot, plus
 * where they are heading. `share` is how much of the run the passer
 * reads, which is their vision.
 */
export function leadFor(from: Vec3, receiver: Athlete, share = 0.8): Vec2 {
  let target = { ...receiver.pos };
  for (let i = 0; i < 2; i++) {
    const d = Math.hypot(target.x - from.x, target.z - from.z);
    const v0 = Math.min(PASS.maxSpeed, rollSpeedFor(d, PASS.arrive));
    const t = rollArrival(v0, d);
    target = { x: receiver.pos.x + receiver.vel.x * t * share, z: receiver.pos.z + receiver.vel.z * t * share };
  }
  return target;
}

/**
 * A lofted pass that comes down at `to`. It starts from the drag free
 * arc and then flies trial balls with the match's own physics, stretching
 * the kick until the first bounce lands on the spot.
 */
export function loftVelocity(from: Vec3, to: Vec2): Vec3 {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const d = Math.max(1, Math.hypot(dx, dz));
  const flat = Math.min(PASS.loftMax, PASS.loftMin + d * 0.32);
  const t = d / flat;
  const base = { x: (dx / d) * flat, y: 0.5 * BALL.gravity * t, z: (dz / d) * flat };
  // Keeping the angle and scaling the pace: the carry grows with its square.
  let k = 1;
  for (let i = 0; i < 8; i++) {
    const carried = landing(from, { x: base.x * k, y: base.y * k, z: base.z * k });
    if (Math.abs(carried - d) < 0.05) break;
    k *= Math.sqrt(d / Math.max(0.5, carried));
  }
  return { x: base.x * k, y: base.y * k, z: base.z * k };
}

/** How far a ball kicked with `vel` flies before its first bounce. */
function landing(from: Vec3, vel: Vec3): number {
  const ball = newBall();
  ball.pos = { ...from, y: Math.max(from.y, BALL.radius) };
  ball.vel = { ...vel };
  const contacts: Contact[] = [];
  for (let t = 0; t < 5 && contacts.length === 0; t += STEP) stepBall(ball, STEP, contacts, { flightOnly: true });
  return Math.hypot(ball.pos.x - from.x, ball.pos.z - from.z);
}
