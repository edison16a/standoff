/**
 * How a championship belt's strap bends. The middle, under the plates,
 * stays flat. Past `flat` metres either side of the middle the leather
 * curls back behind the plate around a circle of `radius` metres, the
 * way a belt held up by its sides flops back over the hands. A small
 * radius curls the ends right round; a big one barely bends.
 */
export interface BeltBend {
  /** Half the flat width in the middle, in metres. */
  flat: number;
  /** How tight the ends curl back. Infinity keeps the strap straight. */
  radius: number;
}

export interface BentPoint {
  x: number;
  z: number;
  /** Turn about the vertical: the strap's face points this far round from +z. */
  angle: number;
}

/** Where a point `x` metres along the straight strap ends up once bent, on the strap's middle surface. */
export function bendAt(x: number, bend: BeltBend): BentPoint {
  const side = Math.sign(x) || 1;
  const past = Math.abs(x) - bend.flat;
  if (past <= 0 || !Number.isFinite(bend.radius)) return { x, z: 0, angle: 0 };
  const theta = past / bend.radius;
  return {
    x: side * (bend.flat + bend.radius * Math.sin(theta)),
    z: -bend.radius * (1 - Math.cos(theta)),
    angle: side * theta,
  };
}

/** Bends one vertex in place: `x` along the strap, `z` out of its face. */
export function bendVertex(x: number, z: number, bend: BeltBend): { x: number; z: number } {
  const at = bendAt(x, bend);
  return { x: at.x + z * Math.sin(at.angle), z: at.z + z * Math.cos(at.angle) };
}
