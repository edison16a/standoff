import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { BoneName, Rig } from "./rig";

/** Up to four bones and how much each moves a vertex. The weights need not add to one; they are normalised. */
export type Influence = readonly (readonly [BoneName, number])[];

/** How rough a surface is, for the whole piece or vertex by vertex from its rest position. */
export type Roughness = number | ((p: THREE.Vector3) => number);

const KEEP = new Set(["position", "normal", "uv", "color", "skinIndex", "skinWeight", "rough"]);
const p = new THREE.Vector3();

/** Fills in what a piece lacks so every piece merges: an index, uvs, white vertex colours and a middling roughness. */
function complete(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const count = geo.getAttribute("position").count;
  if (!geo.index) geo.setIndex(Array.from({ length: count }, (_, i) => i));
  if (!geo.getAttribute("normal")) geo.computeVertexNormals();
  if (!geo.getAttribute("uv")) geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  if (!geo.getAttribute("color")) geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(count * 3).fill(1), 3));
  if (!geo.getAttribute("rough")) roughen(geo, 0.6);
  for (const name of Object.keys(geo.attributes)) if (!KEEP.has(name)) geo.deleteAttribute(name);
  return geo;
}

/** Sets how rough a piece is, for all of it or vertex by vertex from its position. */
export function roughen(geo: THREE.BufferGeometry, rough: Roughness): THREE.BufferGeometry {
  const pos = geo.getAttribute("position");
  const r = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) r[i] = typeof rough === "number" ? rough : rough(p.fromBufferAttribute(pos, i));
  geo.setAttribute("rough", new THREE.Float32BufferAttribute(r, 1));
  return geo;
}

/**
 * Everything one material draws for one player, gathered piece by piece
 * and merged into a single skinned mesh: one draw for all of a player's
 * skin, one for the kit, one for the gear. Each piece says which bones
 * move it, so a stiff part rides one bone and a limb bends smoothly
 * across its joints.
 */
export class PartList {
  private readonly parts: THREE.BufferGeometry[] = [];

  constructor(private readonly rig: Rig) {}

  /** A stiff piece riding one bone, built in that bone's frame at rest. Without `rough` it keeps its own. */
  rigid(geo: THREE.BufferGeometry, bone: BoneName, rough?: Roughness): void {
    geo.translate(...this.rig.rest(bone).toArray());
    this.weighted(geo, () => [[bone, 1]], rough);
  }

  /** A piece built in the model's space, each vertex weighted by where it sits at rest. Without `rough` it keeps its own. */
  weighted(geo: THREE.BufferGeometry, weigh: (at: THREE.Vector3) => Influence, rough?: Roughness): void {
    if (rough !== undefined) roughen(geo, rough);
    complete(geo);
    const pos = geo.getAttribute("position");
    const n = pos.count;
    const index = new Uint16Array(n * 4);
    const weight = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      p.fromBufferAttribute(pos, i);
      const inf = weigh(p).filter(([, w]) => w > 1e-4).slice(0, 4);
      const total = inf.reduce((sum, [, w]) => sum + w, 0) || 1;
      inf.forEach(([bone, w], k) => {
        index[i * 4 + k] = this.rig.index(bone);
        weight[i * 4 + k] = w / total;
      });
    }
    geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(index, 4));
    geo.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weight, 4));
    this.parts.push(geo);
  }

  /** The merged geometry, or null if nothing was added. The pieces are freed. */
  geometry(): THREE.BufferGeometry | null {
    if (!this.parts.length) return null;
    const merged = mergeGeometries(this.parts, false);
    for (const part of this.parts) part.dispose();
    this.parts.length = 0;
    if (!merged) throw new Error("Athlete parts did not merge.");
    return merged;
  }
}

/** Paints every vertex of a piece one colour, or each by its position. Keeps the index and uvs. */
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

/** Moves, turns and scales a piece in place. Euler angles in radians, X then Y then Z. */
export function place(geo: THREE.BufferGeometry, at: readonly number[] = [0, 0, 0], rot: readonly number[] = [0, 0, 0], scale: number | readonly number[] = 1): THREE.BufferGeometry {
  const s = typeof scale === "number" ? [scale, scale, scale] : scale;
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(at[0], at[1], at[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
    new THREE.Vector3(s[0], s[1], s[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}

/** Merges plain pieces (painted and placed) into one, before they are skinned. */
export function join(pieces: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(pieces.map(complete), false);
  for (const piece of pieces) piece.dispose();
  if (!merged) throw new Error("Pieces did not merge.");
  return merged;
}

export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
