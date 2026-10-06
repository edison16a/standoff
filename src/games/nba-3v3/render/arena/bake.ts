import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const KEEP = ["position", "normal", "uv"];
const e = new THREE.Euler();
const q = new THREE.Quaternion();
const v = new THREE.Vector3();
const one = new THREE.Vector3(1, 1, 1);

/** A piece's placement: where it goes and how it is turned (radians, XYZ). */
export interface Place {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
}

/**
 * Bakes many static pieces into one mesh per material, so a structure
 * built from dozens of boxes and tubes costs a draw per finish rather
 * than a draw per piece. Pieces are placed once, here, and never move
 * apart again.
 */
export class Bake {
  private readonly parts = new Map<THREE.Material, THREE.BufferGeometry[]>();

  /** Adds a piece in `mat`, placed by `at`. The piece is consumed. */
  add(geo: THREE.BufferGeometry, mat: THREE.Material, at: Place = {}): this {
    const m = new THREE.Matrix4().compose(v.set(at.x ?? 0, at.y ?? 0, at.z ?? 0), q.setFromEuler(e.set(at.rx ?? 0, at.ry ?? 0, at.rz ?? 0)), one);
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    for (const name of Object.keys(g.attributes)) if (!KEEP.includes(name)) g.deleteAttribute(name);
    if (!g.getAttribute("uv")) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute("position").count * 2), 2));
    g.applyMatrix4(m);
    const list = this.parts.get(mat) ?? [];
    list.push(g);
    this.parts.set(mat, list);
    return this;
  }

  /** One mesh per material, casting and taking shadows unless told not to. */
  build(shadows = true): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for (const [mat, list] of this.parts) {
      const merged = mergeGeometries(list, false);
      for (const g of list) g.dispose();
      if (!merged) throw new Error("Arena pieces did not merge.");
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = shadows;
      mesh.receiveShadow = shadows;
      out.push(mesh);
    }
    this.parts.clear();
    return out;
  }
}

/** A round tube from `a` to `b`, for steel arms and braces. */
export function tube(a: THREE.Vector3, b: THREE.Vector3, radius: number, sides = 10): THREE.BufferGeometry {
  const len = a.distanceTo(b);
  const geo = new THREE.CylinderGeometry(radius, radius, len, sides, 1);
  const dir = v.subVectors(b, a).normalize();
  geo.applyQuaternion(q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
  geo.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return geo;
}
