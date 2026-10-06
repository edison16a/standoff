/**
 * Two bone leg reach: the thigh and shin angles that put the ankle at a
 * point, in the frame of the pelvis with the leg hanging down -y. The
 * hip turns about x (positive swings the leg back) after spreading it
 * about z (positive toward +x), and the knee only bends, heel up behind.
 * A point out of reach is reached for as far as the leg goes.
 */
export interface LegSolution {
  hx: number;
  hz: number;
  knee: number;
  /** How far past the leg's full length the point was, in metres; 0 when it is in reach. */
  short: number;
}

export function solveLeg(dx: number, dy: number, dz: number, thigh: number, shin: number): LegSolution {
  const want = Math.hypot(dx, dy, dz);
  const most = (thigh + shin) * 0.9995;
  const least = Math.abs(thigh - shin) + 1e-3;
  const len = Math.max(least, Math.min(most, want));
  // The knee's inside angle from the triangle's sides; the bend is how far it is from straight.
  const cosInside = (thigh * thigh + shin * shin - len * len) / (2 * thigh * shin);
  const knee = Math.PI - Math.acos(Math.max(-1, Math.min(1, cosInside)));
  // The ankle with that bend and the hip unturned.
  const py = -thigh - shin * Math.cos(knee);
  const pz = -shin * Math.sin(knee);
  const k = len / Math.max(1e-6, want);
  const [x, y, z] = [dx * k, dy * k, dz * k];
  const hz = Math.asin(Math.max(-1, Math.min(1, x / -py)));
  const y1 = py * Math.cos(hz);
  const hx = Math.atan2(z, y) - Math.atan2(pz, y1);
  return { hx: wrap(hx), hz, knee, short: Math.max(0, want - most) };
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
