import * as THREE from "three";
import type { Piece } from "../../engine/arena";
import { box, cyl, lathe, merge, paint, rod, roundBox, torus, type Vec } from "../geo";
import { FIELD_COLOURS as C } from "../palette";

/**
 * The cover, one model per kind, each sized to the engine's shape for that
 * piece so a bullet stops where the eye sees the bunker. Inflatables get
 * seams, bands and tie down straps; the barrels and walls are hard props.
 * Everything merges into two meshes: soft (inflatable) and hard.
 */

type Parts = THREE.BufferGeometry[];

/** A banded solid of revolution: each band is [top height, colour]. */
function bands(profile: (y: number) => number, top: number, list: readonly (readonly [number, string])[], at: Vec): Parts {
  const out: Parts = [];
  let from = 0;
  for (const [to, colour] of list) {
    const steps = Math.max(2, Math.ceil(((to - from) / top) * 36));
    const pts: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const y = from + ((to - from) * i) / steps;
      pts.push([profile(y), y]);
    }
    // The last band closes over the top.
    if (to >= top) pts.push([0, top]);
    out.push(paint(lathe(pts, 32), colour, { at }));
    from = to;
  }
  return out;
}

/** A radius `r` rounded over the top edge with radius `k`, leaving a flat top of radius r - k. */
function rounded(r: number, h: number, k: number, y: number): number {
  if (y <= h - k) return r;
  const t = Math.min(1, (y - (h - k)) / k);
  return r - k + k * Math.sqrt(1 - t * t);
}

/** Tie down straps over a round bunker, with the stakes they end in. */
function straps(r: number, h: number, at: Vec, count = 4): Parts {
  const out: Parts = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.PI / 4;
    const x = Math.sin(a);
    const z = Math.cos(a);
    out.push(rod([at[0] + x * (r + 0.01), 0.02, at[2] + z * (r + 0.01)], [at[0] + x * (r * 0.97), h * 0.55, at[2] + z * (r * 0.97)], 0.018, C.strap, 5));
    out.push(paint(cyl(0.02, 0.03, 0.06, 6), C.strap, { at: [at[0] + x * (r + 0.05), 0.03, at[2] + z * (r + 0.05)] }));
  }
  return out;
}

function can(p: Piece, r: number, at: Vec): Parts {
  const f = (y: number) => rounded(r, p.h, 0.3, y);
  return [
    ...bands(f, p.h, [[0.22, C.charcoal], [1.05, C.lime], [1.2, C.charcoal], [1.26, C.white], [p.h, C.lime]], at),
    ...straps(r, p.h, at),
  ];
}

function dorito(p: Piece, r: number, at: Vec): Parts {
  // A squat beehive: full width low down, rounding in well over the top.
  const f = (y: number) => rounded(r, p.h, 0.5, y);
  return [...bands(f, p.h, [[0.18, C.charcoal], [0.62, C.lime], [0.7, C.white], [p.h, C.charcoal]], at), ...straps(r, p.h, at, 3)];
}

function cake(p: Piece, r: number, at: Vec): Parts {
  // Tiers of rings, like a stack of tyres.
  const f = (y: number) => rounded(r * (0.96 + 0.04 * Math.abs(Math.cos((y / p.h) * Math.PI * 3))), p.h, 0.2, y);
  return [...bands(f, p.h, [[0.42, C.lime], [0.5, C.white], [0.84, C.charcoal], [0.92, C.white], [p.h, C.lime]], at), ...straps(r, p.h, at, 6)];
}

function softBox(w: number, h: number, d: number, at: Vec, colour: string, stripe: string, rot = 0): Parts {
  const round = Math.min(0.22, w / 3, d / 3);
  const body = paint(roundBox(w, h, d, round, 3), colour, { at: [at[0], h / 2, at[2]], rot: [0, rot, 0] });
  const band = paint(roundBox(w + 0.012, 0.12, d + 0.012, round, 2), stripe, { at: [at[0], h * 0.62, at[2]], rot: [0, rot, 0] });
  const base = paint(roundBox(w + 0.01, 0.16, d + 0.01, round, 2), C.charcoal, { at: [at[0], 0.08, at[2]], rot: [0, rot, 0] });
  return [body, band, base];
}

function snake(p: Piece, hw: number, hd: number, at: Vec): Parts {
  // A chain of pillows pinched at the seams, running along the long side.
  const long = hd > hw ? "z" : "x";
  const length = Math.max(hw, hd) * 2;
  const width = Math.min(hw, hd) * 2;
  const count = Math.max(2, Math.round(length / 1));
  const seg = length / count;
  const out: Parts = [];
  for (let i = 0; i < count; i++) {
    const off = -length / 2 + seg * (i + 0.5);
    const pos: Vec = long === "z" ? [at[0], 0, at[2] + off] : [at[0] + off, 0, at[2]];
    const [w, d] = long === "z" ? [width, seg * 0.98] : [seg * 0.98, width];
    out.push(...softBox(w, p.h, d, pos, i % 2 ? C.charcoal : C.lime, C.white));
  }
  return out;
}

function tower(p: Piece, hw: number, hd: number, at: Vec): Parts {
  const out = softBox(hw * 2, p.h, hd * 2, at, C.charcoal, C.lime);
  // A white stripe up each corner and a pennant on top, like a pro field's towers.
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    out.push(paint(box(0.1, p.h - 0.4, 0.1), C.white, { at: [at[0] + sx * (hw - 0.1), p.h / 2, at[2] + sz * (hd - 0.1)] }));
  }
  out.push(rod([at[0], p.h - 0.05, at[2]], [at[0], p.h + 1.1, at[2]], 0.025, C.netPost));
  out.push(paint(box(0.02, 0.36, 0.6), C.lime, { at: [at[0], p.h + 0.9, at[2] + 0.3] }));
  return out;
}

/** The soft pieces for one bunker. Walls and barrels come from `hardParts`. */
export function softParts(p: Piece): Parts {
  const at: Vec = [p.x, 0, p.z];
  const s = p.shape;
  if (s.type === "circle") {
    if (p.kind === "can") return can(p, s.r, at);
    if (p.kind === "dorito") return dorito(p, s.r, at);
    if (p.kind === "cake") return cake(p, s.r, at);
    return [];
  }
  if (p.kind === "snake") return snake(p, s.hw, s.hd, at);
  if (p.kind === "tower") return tower(p, s.hw, s.hd, at);
  if (p.kind === "brick") return softBox(s.hw * 2, p.h, s.hd * 2, at, C.charcoal, C.lime);
  return [];
}

/** A steel drum with rolled rims and a painted band. */
function drum(r: number, h: number, at: Vec): Parts {
  const out: Parts = [paint(cyl(r * 0.98, r * 0.98, h, 24), C.drum, { at: [at[0], h / 2, at[2]] })];
  for (const y of [0.02, h * 0.33, h * 0.66, h - 0.02]) out.push(paint(torus(r * 0.98, 0.018, 28, 6), C.drumDark, { at: [at[0], y, at[2]], rot: [Math.PI / 2, 0, 0] }));
  out.push(paint(cyl(r * 0.9, r * 0.9, 0.01, 24), C.drumDark, { at: [at[0], h, at[2]] }));
  out.push(paint(cyl(0.05, 0.05, 0.02, 10), C.charcoal, { at: [at[0] + r * 0.5, h + 0.01, at[2]] }));
  return out;
}

/** A plywood wall on posts, with hazard stripes along the top. */
function wall(p: Piece, hw: number, hd: number, at: Vec): Parts {
  const along = hw > hd;
  const len = (along ? hw : hd) * 2;
  const thick = (along ? hd : hw) * 2;
  const rot = along ? 0 : Math.PI / 2;
  const out: Parts = [paint(box(len, p.h, thick * 0.7), C.plywood, { at: [at[0], p.h / 2, at[2]], rot: [0, rot, 0] })];
  const dir = along ? [1, 0] : [0, 1];
  for (let i = 0; i <= 2; i++) {
    const off = -len / 2 + (len * i) / 2;
    const px = at[0] + dir[0]! * off;
    const pz = at[2] + dir[1]! * off;
    out.push(paint(box(0.12, p.h + 0.08, thick), C.plywoodDark, { at: [px, (p.h + 0.08) / 2, pz], rot: [0, rot, 0] }));
  }
  const stripes = Math.round(len / 0.4);
  for (let i = 0; i < stripes; i++) {
    const off = -len / 2 + (i + 0.5) * (len / stripes);
    out.push(paint(box(len / stripes, 0.22, thick * 0.74), i % 2 ? C.charcoal : C.lime, { at: [at[0] + dir[0]! * off, p.h - 0.16, at[2] + dir[1]! * off], rot: [0, rot, 0] }));
  }
  // Plank seams across the face.
  for (let y = 0.45; y < p.h - 0.3; y += 0.45) out.push(paint(box(len, 0.02, thick * 0.72), C.plywoodDark, { at: [at[0], y, at[2]], rot: [0, rot, 0] }));
  return out;
}

export function hardParts(p: Piece): Parts {
  const s = p.shape;
  if (p.kind === "barrel" && s.type === "circle") return drum(s.r, p.h, [p.x, 0, p.z]);
  if (p.kind === "wall" && s.type === "box") return wall(p, s.hw, s.hd, [p.x, 0, p.z]);
  return [];
}

/** Every piece as two merged meshes: the inflatables' soft sheen and the props' hard finish. */
export function buildCover(pieces: readonly Piece[]): THREE.Group {
  const group = new THREE.Group();
  const soft = pieces.flatMap(softParts);
  const hard = pieces.flatMap(hardParts);
  const softMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0 });
  const hardMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.15 });
  for (const [parts, mat] of [[soft, softMat], [hard, hardMat]] as const) {
    if (parts.length === 0) continue;
    const mesh = new THREE.Mesh(merge(parts), mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
