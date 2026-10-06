import * as THREE from "three";
import type { HeadSurface } from "./sculpt";

/**
 * A shell lifted off the head by `lift(base, dir)` metres along the
 * normal at each vertex, keeping only the triangles where all three
 * corners lift: hair, a beard. `paint` colours each corner from the
 * head's spot under it, so an edge can fade into the skin. With `rim`
 * the shell's open edge is closed by a short skirt down to the scalp,
 * so a thick crop never shows its hollow inside.
 */
export function shell(
  head: HeadSurface,
  lift: (base: THREE.Vector3, dir: THREE.Vector3) => number,
  paint: (base: THREE.Vector3, dir: THREE.Vector3, out: THREE.Color) => void,
  rim = true,
): THREE.BufferGeometry | null {
  const pos = head.geo.getAttribute("position");
  const nrm = head.geo.getAttribute("normal");
  const idx = head.geo.index!;
  const amount = new Float32Array(pos.count);
  const b = new THREE.Vector3();
  const d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) amount[i] = lift(b.fromArray(head.bases, i * 3), d.fromArray(head.dirs, i * 3));
  const keep: number[] = [];
  for (let t = 0; t < idx.count; t += 3) {
    const [x, y, z] = [idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)];
    if (amount[x]! > 0 && amount[y]! > 0 && amount[z]! > 0) keep.push(x, y, z);
  }
  if (!keep.length) return null;
  // Only the corners used are kept, renumbered; the skirt's foot copies each edge corner down on the scalp.
  const map = new Map<number, number>();
  for (const i of keep) if (!map.has(i)) map.set(i, map.size);
  const edges = rim ? openEdges(keep) : [];
  const feet = new Map<number, number>();
  for (const [a, c] of edges) for (const i of [a, c]) if (!feet.has(i)) feet.set(i, map.size + feet.size);
  const total = map.size + feet.size;
  const out = new Float32Array(total * 3);
  const colours = new Float32Array(total * 3);
  const col = new THREE.Color();
  const put = (i: number, j: number, a: number) => {
    out.set([pos.getX(i) + nrm.getX(i) * a, pos.getY(i) + nrm.getY(i) * a, pos.getZ(i) + nrm.getZ(i) * a], j * 3);
    paint(b.fromArray(head.bases, i * 3), d.fromArray(head.dirs, i * 3), col);
    colours.set([col.r, col.g, col.b], j * 3);
  };
  for (const [i, j] of map) put(i, j, amount[i]!);
  for (const [i, j] of feet) put(i, j, 0.0004);
  const index = keep.map((i) => map.get(i)!);
  // Each open edge gets a quad down to the scalp, wound to face outward like the triangle it bounds.
  for (const [a, c] of edges) index.push(map.get(c)!, map.get(a)!, feet.get(a)!, map.get(c)!, feet.get(a)!, feet.get(c)!);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(out, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

/** The edges used by only one kept triangle, in that triangle's winding. */
function openEdges(tris: readonly number[]): [number, number][] {
  const count = new Map<string, number>();
  const key = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
  for (let t = 0; t < tris.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const k = key(tris[t + e]!, tris[t + ((e + 1) % 3)]!);
      count.set(k, (count.get(k) ?? 0) + 1);
    }
  }
  const out: [number, number][] = [];
  for (let t = 0; t < tris.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = tris[t + e]!;
      const c = tris[t + ((e + 1) % 3)]!;
      if (count.get(key(a, c)) === 1) out.push([a, c]);
    }
  }
  return out;
}

/** A cheap, smooth 3D noise in -1 to 1, for curls and the grain of hair. */
export function noise3(x: number, y: number, z: number): number {
  return (
    Math.sin(x * 1.7 + Math.sin(y * 2.3) * 1.3) * Math.cos(y * 1.9 + Math.sin(z * 1.1) * 1.7) * 0.6 +
    Math.sin(z * 2.9 + Math.cos(x * 2.1)) * 0.4
  );
}
