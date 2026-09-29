import { BODY } from "./tuning";
import { add, angleDiff, angleOf, clamp, clampLen, dot, len, perp, scale, sub, type Vec2 } from "./vec";

/** How a body can change its run, from its mass and stats. */
export interface Limits {
  /** Top speed, yards a second. */
  top: number;
  /** Forward acceleration from a standstill, tapering toward top speed. */
  drive: number;
  /** Braking, which is stronger than driving. */
  brake: number;
  /** Sideways acceleration, which sets the turning circle at speed. */
  grip: number;
}

/**
 * Limits for a body of this mass with these 0 to 1 stats. Heavier bodies
 * get going and turn more slowly, which is what makes a big back feel big.
 */
export function limitsFor(mass: number, top: number, strength: number, agility: number): Limits {
  const heavy = BODY.refMass / mass;
  return {
    top,
    drive: (BODY.drive + BODY.driveStrength * strength) * Math.sqrt(heavy),
    brake: BODY.brake * heavy ** 0.3,
    grip: (BODY.grip + BODY.gripAgility * agility) * heavy ** 0.3,
  };
}

/**
 * The new velocity after one step toward the wanted one. Along the run the
 * body drives (weaker the faster it goes) or brakes; across it, grip caps
 * how fast the run can bend, so the turning radius is speed² / grip and a
 * hard cut at full speed first sheds pace. Standing players step off any way.
 */
export function steer(vel: Vec2, want: Vec2, lim: Limits, dt: number): Vec2 {
  const target = clampLen(want, lim.top);
  const s = len(vel);
  const dv = sub(target, vel);
  if (s < BODY.standing) return add(vel, clampLen(dv, lim.drive * dt));
  const t = scale(vel, 1 / s);
  const n = perp(t);
  const along = dot(dv, t);
  const across = dot(dv, n);
  const push = lim.drive * Math.max(0.12, 1 - s / lim.top);
  const da = clamp(along, -lim.brake * dt, push * dt);
  const dn = clamp(across, -lim.grip * dt, lim.grip * dt);
  const next = add(add(vel, t, da), n, dn);
  // Bending the run must not add pace: keep it no faster than it was plus the drive.
  return clampLen(next, Math.max(s + Math.max(da, 0), len(target)));
}

/** Metres covered by one full stride cycle at this speed: short quick steps slow, long ones flat out. */
export function cycleLength(speed: number): number {
  return clamp(0.6 + 0.28 * speed, 0.7, 3);
}

/** Turns the body toward an angle at the body's turning rate. */
export function turnToward(facing: number, angle: number, dt: number, rate: number = BODY.turn): number {
  const d = angleDiff(facing, angle);
  return facing + clamp(d, -rate * dt, rate * dt);
}

/** Turns to face the run once the body is really moving. */
export function faceRun(facing: number, vel: Vec2, dt: number): number {
  return len(vel) > 0.6 ? turnToward(facing, angleOf(vel), dt) : facing;
}
