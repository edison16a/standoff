import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import type { V3 } from "../geo";
import type { Region } from "./atlas-layout";
import type { Finish } from "./finish";
import { part } from "./part";

export interface DecalSpec {
  /** Centre of the picture on the body. */
  at: V3;
  /** Which way the picture faces, out of the body. */
  facing: "left" | "right" | "back" | "front" | "up";
  /** Width and height of the picture, metres. */
  size: readonly [number, number];
  /** Turns the picture in its own plane, radians. */
  spin?: number;
  /** How deep the projection reaches into curved bodywork. */
  depth?: number;
  finish?: Finish;
  /** Tints the picture; a plain colour stripe uses the white square with this. */
  color?: string;
}

/** The projector's turn for each facing, so text reads the right way round from outside. */
const FACINGS: Record<DecalSpec["facing"], V3> = {
  right: [0, -Math.PI / 2, 0],
  left: [0, Math.PI / 2, 0],
  back: [0, Math.PI, 0],
  front: [0, 0, 0],
  up: [-Math.PI / 2, 0, Math.PI],
};

const projector = new THREE.Vector3();
const a = new THREE.Vector3();
const b = new THREE.Vector3();
const c = new THREE.Vector3();
const n = new THREE.Vector3();

/**
 * A sticker pressed onto curved bodywork: the picture is projected onto
 * the body's own surface, so it wraps round the curves like a real decal,
 * then lifted a hair off it so the two never flicker. Only the faces
 * turned toward the projector keep it, so it never shows through inside.
 */
export function decal(body: THREE.BufferGeometry, region: Region, spec: DecalSpec): THREE.BufferGeometry {
  const mesh = new THREE.Mesh(body);
  mesh.updateMatrixWorld(true);
  const rot = FACINGS[spec.facing];
  const orientation = new THREE.Euler(rot[0], rot[1], rot[2] + (spec.spin ?? 0), "XYZ");
  const size = new THREE.Vector3(spec.size[0], spec.size[1], spec.depth ?? 0.4);
  const raw = new DecalGeometry(mesh, new THREE.Vector3(...spec.at), orientation, size);
  projector.set(0, 0, 1).applyEuler(orientation);
  const pos = raw.getAttribute("position");
  const uv = raw.getAttribute("uv");
  const nor = raw.getAttribute("normal");
  const keepPos: number[] = [];
  const keepNor: number[] = [];
  const keepUv: number[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    if (normal.dot(projector) < 0.2) continue;
    for (let k = 0; k < 3; k++) {
      const p = [a, b, c][k]!;
      // The body's own smooth normals, so the sticker shades exactly like the paint under it.
      n.fromBufferAttribute(nor, i + k);
      keepPos.push(p.x + n.x * 0.004, p.y + n.y * 0.004, p.z + n.z * 0.004);
      keepNor.push(n.x, n.y, n.z);
      keepUv.push(uv.getX(i + k), uv.getY(i + k));
    }
  }
  raw.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(keepPos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(keepNor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(keepUv, 2));
  return part(g, spec.color ?? "#ffffff", { finish: spec.finish ?? "paint", region });
}
