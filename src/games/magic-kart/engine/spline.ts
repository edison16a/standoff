/**
 * A closed centripetal Catmull Rom curve through the control points.
 * Centripetal because the uniform kind loops and overshoots where points
 * are unevenly spaced, which would put kinks in the road.
 */

export interface P3 {
  x: number;
  y: number;
  z: number;
}

function knot(a: P3, b: P3): number {
  const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  return Math.max(1e-4, Math.sqrt(d));
}

function mix(a: P3, b: P3, ta: number, tb: number, t: number): P3 {
  const span = tb - ta;
  const wa = (tb - t) / span;
  const wb = (t - ta) / span;
  return { x: a.x * wa + b.x * wb, y: a.y * wa + b.y * wb, z: a.z * wa + b.z * wb };
}

/** The point at u (0 to 1) on the segment between p1 and p2. */
function segmentPoint(p0: P3, p1: P3, p2: P3, p3: P3, u: number): P3 {
  const t0 = 0;
  const t1 = t0 + knot(p0, p1);
  const t2 = t1 + knot(p1, p2);
  const t3 = t2 + knot(p2, p3);
  const t = t1 + (t2 - t1) * u;
  const a1 = mix(p0, p1, t0, t1, t);
  const a2 = mix(p1, p2, t1, t2, t);
  const a3 = mix(p2, p3, t2, t3, t);
  const b1 = mix(a1, a2, t0, t2, t);
  const b2 = mix(a2, a3, t1, t3, t);
  return mix(b1, b2, t1, t2, t);
}

/**
 * Samples the closed curve finely, then resamples it at an even spacing,
 * so every sample is the same distance apart along the road.
 */
export function sampleClosedCurve(points: readonly P3[], spacing: number): P3[] {
  const n = points.length;
  const fine: P3[] = [];
  const perSegment = 60;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]!;
    const p1 = points[i]!;
    const p2 = points[(i + 1) % n]!;
    const p3 = points[(i + 2) % n]!;
    for (let k = 0; k < perSegment; k++) fine.push(segmentPoint(p0, p1, p2, p3, k / perSegment));
  }
  const lengths = [0];
  for (let i = 1; i <= fine.length; i++) {
    const a = fine[i - 1]!;
    const b = fine[i % fine.length]!;
    lengths.push(lengths[i - 1]! + Math.hypot(b.x - a.x, b.z - a.z));
  }
  const total = lengths[fine.length]!;
  const count = Math.max(8, Math.round(total / spacing));
  const step = total / count;
  const out: P3[] = [];
  let j = 0;
  for (let i = 0; i < count; i++) {
    const target = i * step;
    while (lengths[j + 1]! < target) j++;
    const a = fine[j]!;
    const b = fine[(j + 1) % fine.length]!;
    const f = (target - lengths[j]!) / Math.max(1e-6, lengths[j + 1]! - lengths[j]!);
    out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f });
  }
  return out;
}
