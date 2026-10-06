import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BONES, type BoneName } from "./rig";

/** Up to four bones and how much each moves a vertex. The weights are normalised. */
export type Influence = readonly (readonly [BoneName, number])[];

/** A value for the whole piece, or vertex by vertex from its rest position. */
export type PerVertex = number | ((p: THREE.Vector3) => number);

const KEEP = new Set(["position", "normal", "uv", "color", "rough", "grain", "skinIndex", "skinWeight"]);
const p = new THREE.Vector3();

/** Sets how rough a piece is: 0 is wet and glossy (eyes), 1 dull (cotton). The shader reads it per vertex. */
export function roughen(geo: THREE.BufferGeometry, rough: PerVertex): THREE.BufferGeometry {
  const pos = geo.getAttribute("position");
  const r = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) r[i] = typeof rough === "number" ? rough : rough(p.fromBufferAttribute(pos, i));
  geo.setAttribute("rough", new THREE.BufferAttribute(r, 1));
  return geo;
}

/**
 * Marks a piece as hair for the shader, which draws strands in it pixel
 * by pixel: `grain` scales the strand pattern along x, y and z, so the
 * largest number is the way the strands lie across.
 */
export function groom(geo: THREE.BufferGeometry, grain: readonly [number, number, number]): THREE.BufferGeometry {
  const n = geo.getAttribute("position").count;
  const g = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) g.set(grain, i * 3);
  geo.setAttribute("grain", new THREE.BufferAttribute(g, 3));
  return geo;
}

/** Paints every vertex one colour, or each by its position. */
export function tint(geo: THREE.BufferGeometry, colour: THREE.ColorRepresentation | ((at: THREE.Vector3, out: THREE.Color) => void)): THREE.BufferGeometry {
  const pos = geo.getAttribute("position");
  const out = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  if (typeof colour !== "function") c.set(colour);
  for (let i = 0; i < pos.count; i++) {
    if (typeof colour === "function") colour(p.fromBufferAttribute(pos, i), c);
    out.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(out, 3));
  return geo;
}

/** Darkens a piece's colours where `occlusion` says light hardly reaches: a bake of the soft shadow in creases. */
export function occlude(geo: THREE.BufferGeometry, occlusion: (at: THREE.Vector3) => number): THREE.BufferGeometry {
  const pos = geo.getAttribute("position");
  const col = geo.getAttribute("color") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const k = 1 - occlusion(p.fromBufferAttribute(pos, i));
    col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k);
  }
  return geo;
}

/** Moves, turns and scales a piece in place. Euler angles in radians, X then Y then Z. */
export function place(geo: THREE.BufferGeometry, at: readonly number[] = [0, 0, 0], rot: readonly number[] = [0, 0, 0], scale: number | readonly number[] = 1): THREE.BufferGeometry {
  const s = typeof scale === "number" ? [scale, scale, scale] : scale;
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(at[0], at[1], at[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
    new THREE.Vector3(s[0], s[1], s[2]),
  );
  return geo.applyMatrix4(m);
}

/** Fills in what a piece lacks so all pieces merge: an index, uvs, white colours, a middling roughness. */
function complete(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const count = geo.getAttribute("position").count;
  if (!geo.index) geo.setIndex(Array.from({ length: count }, (_, i) => i));
  if (!geo.getAttribute("normal")) geo.computeVertexNormals();
  if (!geo.getAttribute("uv")) geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  if (!geo.getAttribute("color")) geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(count * 3).fill(1), 3));
  if (!geo.getAttribute("rough")) roughen(geo, 0.6);
  if (!geo.getAttribute("grain")) geo.setAttribute("grain", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  for (const name of Object.keys(geo.attributes)) if (!KEEP.has(name)) geo.deleteAttribute(name);
  return geo;
}

/** Merges plain pieces (tinted and placed) into one before they are skinned. */
export function join(pieces: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(pieces.map(complete), false);
  for (const piece of pieces) piece.dispose();
  if (!merged) throw new Error("Body pieces did not merge.");
  return merged;
}

/**
 * Everything one material draws for one body, gathered piece by piece
 * and merged into a single skinned geometry: one draw for all the skin,
 * one for the kit, one for the gear. Each piece says which bones move
 * it, so a stiff part rides one bone and a limb bends smoothly.
 */
export class PartList {
  private readonly parts: THREE.BufferGeometry[] = [];

  constructor(private readonly rest: Record<BoneName, THREE.Vector3>) {}

  /** A stiff piece riding one bone, built round that bone's spot at rest. */
  rigid(geo: THREE.BufferGeometry, bone: BoneName): void {
    geo.translate(this.rest[bone].x, this.rest[bone].y, this.rest[bone].z);
    this.weighted(geo, () => [[bone, 1]]);
  }

  /** A piece built in the model's space, each vertex weighted by where it sits at rest. */
  weighted(geo: THREE.BufferGeometry, weigh: (at: THREE.Vector3) => Influence): void {
    complete(geo);
    const pos = geo.getAttribute("position");
    const n = pos.count;
    const index = new Uint16Array(n * 4);
    const weight = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const inf = weigh(p.fromBufferAttribute(pos, i)).filter(([, w]) => w > 1e-3).slice(0, 4);
      const total = inf.reduce((sum, [, w]) => sum + w, 0) || 1;
      inf.forEach(([bone, w], k) => {
        index[i * 4 + k] = BONES.indexOf(bone);
        weight[i * 4 + k] = w / total;
      });
    }
    geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(index, 4));
    geo.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weight, 4));
    this.parts.push(geo);
  }

  /** The merged geometry. The pieces are freed. */
  geometry(): THREE.BufferGeometry {
    const merged = mergeGeometries(this.parts, false);
    for (const part of this.parts) part.dispose();
    this.parts.length = 0;
    if (!merged) throw new Error("Body parts did not merge.");
    merged.computeBoundingSphere();
    return merged;
  }
}

/** 0 below `a`, 1 above `b`, smooth between. Works with `a` above `b` too, falling instead. */
export function ramp(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** A soft round bump of height 1 at `c`, `w` wide. */
export const bell = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));
