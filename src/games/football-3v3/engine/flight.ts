import { BALL } from "./tuning";
import { cross3, dot3, len3, norm3, type V3 } from "./vec";

/** A thrown spiral spins about its long axis; a place kick tumbles end over end. */
export type SpinStyle = "spiral" | "tumble";

/**
 * A ball in the air. `nose` is where the long axis points on average and
 * `axis` is where it points this instant, the nose plus a small wobble
 * circling round it. `roll` is how far the ball has turned about its own
 * axis for a spiral, or end over end for a tumble.
 */
export interface Flight {
  pos: V3;
  vel: V3;
  nose: V3;
  axis: V3;
  roll: number;
  /** Radians per second of spin. */
  spin: number;
  /** Half angle of the wobble cone, radians. A tight spiral is near zero. */
  wobble: number;
  wobblePhase: number;
  style: SpinStyle;
}

const UP: V3 = { x: 0, y: 1, z: 0 };

export function launch(pos: V3, vel: V3, style: SpinStyle, spin: number, wobble: number): Flight {
  const nose = norm3(vel);
  return { pos: { ...pos }, vel: { ...vel }, nose, axis: { ...nose }, roll: 0, spin, wobble, wobblePhase: 0, style };
}

/** Drag per metre now: a nose first spiral slips through the air, a ball side on or tumbling does not. */
export function dragFactor(f: Flight): number {
  if (f.style === "tumble") return (BALL.dragNose + BALL.dragSide) * 0.5;
  const along = Math.abs(dot3(f.axis, norm3(f.vel)));
  const side = 1 - along * along;
  return BALL.dragNose + (BALL.dragSide - BALL.dragNose) * side;
}

/** Turns vector v toward target t by at most `rate` of the way this step. */
function follow(v: V3, t: V3, rate: number): V3 {
  return norm3({ x: v.x + (t.x - v.x) * rate, y: v.y + (t.y - v.y) * rate, z: v.z + (t.z - v.z) * rate });
}

/** A unit vector at right angles to `v`, stable as v changes slowly. */
function perpendicular(v: V3): V3 {
  const c = cross3(v, UP);
  return len3(c) < 1e-6 ? { x: 1, y: 0, z: 0 } : norm3(c);
}

/** One step of flight: gravity and drag move the ball, then the spin and wobble turn it. */
export function stepFlight(f: Flight, dt: number): void {
  const k = dragFactor(f);
  const speed = len3(f.vel);
  f.vel.x -= k * speed * f.vel.x * dt;
  f.vel.y -= (BALL.gravity + k * speed * f.vel.y) * dt;
  f.vel.z -= k * speed * f.vel.z * dt;
  f.pos.x += f.vel.x * dt;
  f.pos.y += f.vel.y * dt;
  f.pos.z += f.vel.z * dt;
  f.roll += f.spin * dt;
  const dir = norm3(f.vel);
  if (f.style === "tumble") {
    // End over end about the horizontal line across the flight.
    const side = perpendicular(dir);
    const up = cross3(side, dir);
    f.nose = dir;
    f.axis = norm3({ x: dir.x * Math.cos(f.roll) + up.x * Math.sin(f.roll), y: dir.y * Math.cos(f.roll) + up.y * Math.sin(f.roll), z: dir.z * Math.cos(f.roll) + up.z * Math.sin(f.roll) });
    return;
  }
  // A good spiral's nose tips over to follow the arc, a little behind it.
  f.nose = follow(f.nose, dir, Math.min(1, BALL.noseFollow * dt));
  // The wobble circles the nose (precession) and slowly settles.
  f.wobblePhase += f.spin * 0.16 * dt;
  f.wobble *= Math.exp(-0.35 * dt);
  const a = perpendicular(f.nose);
  const b = cross3(a, f.nose);
  const s = Math.sin(f.wobble);
  const c = Math.cos(f.wobble);
  const cp = Math.cos(f.wobblePhase);
  const sp = Math.sin(f.wobblePhase);
  f.axis = norm3({
    x: f.nose.x * c + (a.x * cp + b.x * sp) * s,
    y: f.nose.y * c + (a.y * cp + b.y * sp) * s,
    z: f.nose.z * c + (a.z * cp + b.z * sp) * s,
  });
}

/** A copy that can be stepped ahead without touching the real ball. */
export function cloneFlight(f: Flight): Flight {
  return { ...f, pos: { ...f.pos }, vel: { ...f.vel }, nose: { ...f.nose }, axis: { ...f.axis } };
}

/**
 * Where the ball will be after `time` seconds, stepped with the same
 * physics. Used to aim throws and kicks, and by bots to read the ball.
 */
export function predict(f: Flight, time: number, dt = 1 / 120): Flight {
  const g = cloneFlight(f);
  for (let t = 0; t < time - 1e-9; t += dt) stepFlight(g, Math.min(dt, time - t));
  return g;
}
