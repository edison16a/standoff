import * as THREE from "three";
import { loft } from "./loft";

/**
 * A round tube swept along a curved centre line: fingers, thumbs, hair
 * twists. Each ring stands square to the line, turned along it without
 * twisting, and the far end closes in a rounded tip.
 */
export interface SweepOptions {
  /** Points round each ring. */
  n: number;
  /** Close the start or the end on a rounded tip. */
  capStart?: boolean;
  capEnd?: boolean;
  /** Squashes each ring across the bend: below 1 flattens it, like a finger's pad. */
  flat?: number;
}

export function sweep(points: readonly THREE.Vector3[], radii: readonly number[], o: SweepOptions): THREE.BufferGeometry {
  const count = points.length;
  const tangents = points.map((p, i) => {
    const a = points[Math.max(0, i - 1)]!;
    const b = points[Math.min(count - 1, i + 1)]!;
    return b.clone().sub(a).normalize();
  });
  // A starting normal square to the first tangent, then carried along without twisting.
  const helper = Math.abs(tangents[0]!.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  let normal = helper.clone().cross(tangents[0]!).normalize();
  const rings: THREE.Vector3[][] = [];
  const q = new THREE.Quaternion();
  for (let i = 0; i < count; i++) {
    if (i > 0) {
      q.setFromUnitVectors(tangents[i - 1]!, tangents[i]!);
      normal = normal.clone().applyQuaternion(q).normalize();
    }
    const t = tangents[i]!;
    const bi = t.clone().cross(normal).normalize();
    const r = radii[i]!;
    const ring: THREE.Vector3[] = [];
    for (let j = 0; j < o.n; j++) {
      const a = (j / o.n) * Math.PI * 2;
      ring.push(points[i]!.clone().addScaledVector(normal, Math.cos(a) * r * (o.flat ?? 1)).addScaledVector(bi, Math.sin(a) * r));
    }
    rings.push(ring);
  }
  const tip = (i: number, dir: number) => points[i]!.clone().addScaledVector(tangents[i]!, dir * radii[i]! * 0.9);
  return loft(rings, { start: o.capStart ? tip(0, -1) : undefined, end: o.capEnd ? tip(count - 1, 1) : undefined });
}

/**
 * A centre line bending in steps: segments of the given lengths, each
 * turned by its own angle about `axis` from the one before, starting
 * from `start` along `dir`. Points are spaced finely enough for a round
 * bend at each joint.
 */
export function jointed(start: THREE.Vector3, dir: THREE.Vector3, axis: THREE.Vector3, lengths: readonly number[], bends: readonly number[], perSegment = 3): THREE.Vector3[] {
  const out = [start.clone()];
  const d = dir.clone().normalize();
  const at = start.clone();
  lengths.forEach((len, i) => {
    d.applyAxisAngle(axis, bends[i] ?? 0);
    for (let k = 1; k <= perSegment; k++) out.push(at.clone().addScaledVector(d, (len * k) / perSegment));
    at.addScaledVector(d, len);
  });
  return out;
}
