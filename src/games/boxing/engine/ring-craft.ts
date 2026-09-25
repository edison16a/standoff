import { between, pick, type Random } from "./random";
import type { RingStyle } from "./styles";
import type { Spot } from "./types";

/** How close to the ropes a boxer is allowed to drift. */
export const ROOM = 2.3;
/** Nearer than this is a clinch, which neither boxer walks into. */
const MIN_GAP = 0.86;
/** Further than this and both close in quickly, so punches never fall short for long. */
const MAX_GAP = 1.55;
/** Top speed on the feet, in metres a second. */
export const WALK = 2.2;

/** One boxer's feet between frames. */
export interface Mover {
  /** Circling speed now, -1 to 1, easing toward `circleTo`. */
  circle: number;
  circleTo: number;
  nextSwitch: number;
  /** Metres still to give ground after a combination. */
  backLeft: number;
  /** When the step back after a combination begins. */
  backAt: number;
  /** Knockback speed from a clean hit, metres a second. */
  knock: number;
  throws: number[];
  /** Offsets the rhythm so two boxers never rock in step. */
  phase: number;
}

export function mover(phase: number): Mover {
  return { circle: 0, circleTo: 0, nextSwitch: 0, backLeft: 0, backAt: Infinity, knock: 0, throws: [], phase };
}

/** A punch thrown. Two within a moment is a combination, and a boxer takes a step back once it lands. */
export function noteThrow(m: Mover, now: number): void {
  m.throws = m.throws.filter((at) => now - at < 1_300);
  m.throws.push(now);
  if (m.throws.length >= 2) {
    m.backAt = now + 450;
    m.throws = [];
  }
}

/**
 * One boxer's feet for one step of a round, the way real boxers move:
 * they circle, switching direction now and then, and rock in and out on
 * the balls of their feet. Each walks toward the range they like, so a
 * stalker slowly walks an out boxer down while the out boxer gives
 * ground. Near the ropes a boxer circles out toward the middle, and a
 * boxer who likes to cut the ring off steps across to stand between the
 * other and the open canvas. After a combination they step back out.
 */
export function stepInFight(me: Spot, them: Spot, style: RingStyle, m: Mover, dt: number, now: number, random: Random): void {
  const dx = them.x - me.x;
  const dz = them.z - me.z;
  const dist = Math.max(1e-3, Math.hypot(dx, dz));
  const u = { x: dx / dist, z: dz / dist };
  const side = { x: u.z, z: -u.x };

  if (now >= m.nextSwitch) {
    m.circleTo = pick(random, [
      [-1, 2],
      [-0.5, 1],
      [0, 1],
      [0.5, 1],
      [1, 2],
    ]);
    m.nextSwitch = now + between(random, style.switchMs[0], style.switchMs[1]);
  }
  // Backed onto the ropes: circle the way that leads back to the middle.
  if (edge(me) > ROOM - 0.45) m.circleTo = -me.x * side.x - me.z * side.z >= 0 ? 1 : -1;
  m.circle += (m.circleTo - m.circle) * Math.min(1, dt * 3);
  let lateral = m.circle * style.circle;
  if (style.cut > 0 && edge(them) > 1.15) {
    // Cutting off the ring: step across to the spot between them and the middle.
    const back = Math.hypot(them.x, them.z) || 1;
    const idealX = them.x - (them.x / back) * dist;
    const idealZ = them.z - (them.z / back) * dist;
    const across = (idealX - me.x) * side.x + (idealZ - me.z) * side.z;
    lateral += clamp(across * 2.5, -0.9, 0.9) * style.cut;
  }

  const want = style.range + style.rhythm * Math.sin(now / 650 + m.phase);
  const gap = dist - want;
  let forward = gap > 0 ? Math.min(style.stalk + 0.15, gap * 2) : Math.max(-0.7, gap * 2.5);
  if (dist > MAX_GAP) forward = WALK * 0.6;
  if (now >= m.backAt) {
    m.backLeft = style.retreat;
    m.backAt = Infinity;
  }
  if (m.backLeft > 0) {
    const step = Math.min(m.backLeft, 1.4 * dt);
    m.backLeft -= step;
    forward -= step / dt;
  }
  if (dist < MIN_GAP) forward = Math.min(forward, -(MIN_GAP - dist) * 4);

  let vx = u.x * forward + side.x * lateral;
  let vz = u.z * forward + side.z * lateral;
  const speed = Math.hypot(vx, vz);
  if (speed > WALK) {
    vx *= WALK / speed;
    vz *= WALK / speed;
  }
  me.x += (vx - u.x * m.knock) * dt;
  me.z += (vz - u.z * m.knock) * dt;
  m.knock = Math.max(0, m.knock - dt * 6);
  keepInside(me);
}

/** Walks toward a spot at a steady pace, stopping on it. Returns true once there. */
export function walkTo(spot: Spot, goal: Spot, dt: number, speed: number): boolean {
  const dx = goal.x - spot.x;
  const dz = goal.z - spot.z;
  const gap = Math.hypot(dx, dz);
  if (gap < 1e-3) return true;
  const step = Math.min(gap, speed * dt);
  spot.x += (dx / gap) * step;
  spot.z += (dz / gap) * step;
  keepInside(spot);
  return gap - step < 0.05;
}

export function keepInside(spot: Spot): void {
  spot.x = clamp(spot.x, -ROOM, ROOM);
  spot.z = clamp(spot.z, -ROOM, ROOM);
}

/** How near the ropes a spot is: the larger of its distances from the middle along the two sides. */
export function edge(spot: Spot): number {
  return Math.max(Math.abs(spot.x), Math.abs(spot.z));
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}
