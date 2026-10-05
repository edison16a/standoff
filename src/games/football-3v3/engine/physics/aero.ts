import { cross3, dot3, type V3 } from "../vec";
import { BALL_SHAPE, longAxis, omegaOf } from "./ball-shape";
import type { Quat } from "./quat";

/**
 * Air on a football, from wind tunnel numbers for a prolate ball. All
 * coefficients use the widest cross section and the length.
 *
 * Drag rises from nose on to side on, so a tight spiral slips through
 * and a tumbling kick or a wobbling duck slows hard. Lift pushes toward
 * the side the nose points off the path, so a nose that rides high
 * floats the ball. The air also tries to turn the ball side on (the
 * centre of pressure is ahead of the centre of mass): with no spin it
 * tips over, but a spiral's spin turns that push into a slow circling
 * of the nose round the path, which is what keeps a good spiral pointed
 * along its arc. Damping slowly settles the wobble and the spin.
 */
export const AIR = {
  density: 1.2,
  area: Math.PI * BALL_SHAPE.radius * BALL_SHAPE.radius,
  length: 2 * BALL_SHAPE.half,
  /** Drag nose on and side on. */
  cdNose: 0.085,
  cdSide: 0.45,
  /** Lift: cl sin(a) cos(a), largest at 45 degrees. */
  cl: 0.25,
  /** Overturning moment: cm sin(a) cos(a). */
  cm: 0.4,
  /** Damping of a wobble (rotation across the long axis) and of the spin. */
  wobbleDamp: 0.6,
  spinDamp: 5e-6,
} as const;

export interface Load {
  force: V3;
  torque: V3;
}

/** Angle of attack as cos and sin squared, between the long axis and the path. */
export function attack(q: Quat, vel: V3): { cos: number; sin2: number } {
  const s = Math.hypot(vel.x, vel.y, vel.z);
  if (s < 1e-6) return { cos: 1, sin2: 0 };
  const c = Math.abs(dot3(longAxis(q), vel)) / s;
  return { cos: c, sin2: Math.max(0, 1 - c * c) };
}

/** The air's force and torque on the ball this instant. */
export function airLoad(q: Quat, vel: V3, L: V3): Load {
  const s = Math.hypot(vel.x, vel.y, vel.z);
  const zero = { x: 0, y: 0, z: 0 };
  if (s < 0.3) return { force: zero, torque: zero };
  const v = { x: vel.x / s, y: vel.y / s, z: vel.z / s };
  const axis = longAxis(q);
  const along = dot3(axis, v);
  // The leading end: a football is the same both ways round.
  const lead = along >= 0 ? axis : { x: -axis.x, y: -axis.y, z: -axis.z };
  const cos = Math.abs(along);
  const sin2 = Math.max(0, 1 - cos * cos);
  const qa = 0.5 * AIR.density * s * s * AIR.area;
  const drag = -qa * (AIR.cdNose + (AIR.cdSide - AIR.cdNose) * sin2);
  // Toward where the nose points off the path; its length is sin(a).
  const off = { x: lead.x - cos * v.x, y: lead.y - cos * v.y, z: lead.z - cos * v.z };
  const lift = qa * AIR.cl * cos;
  const force = { x: drag * v.x + lift * off.x, y: drag * v.y + lift * off.y, z: drag * v.z + lift * off.z };
  // Turning the nose further off the path: about v x lead, whose length is sin(a).
  const turn = cross3(v, lead);
  const over = qa * AIR.length * AIR.cm * cos;
  const w = omegaOf(q, L);
  const spin = dot3(w, axis);
  const across = { x: w.x - spin * axis.x, y: w.y - spin * axis.y, z: w.z - spin * axis.z };
  const damp = 0.25 * AIR.density * s * AIR.area * AIR.length * AIR.length * AIR.wobbleDamp;
  const spinDamp = AIR.spinDamp * s * spin;
  return {
    force,
    torque: {
      x: over * turn.x - damp * across.x - spinDamp * axis.x,
      y: over * turn.y - damp * across.y - spinDamp * axis.y,
      z: over * turn.z - damp * across.z - spinDamp * axis.z,
    },
  };
}
