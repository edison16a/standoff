import * as THREE from "three";
import type { Track } from "../../engine/track";

export { seeded } from "../../engine/random";

/** What the ground builder knows about the nearest bit of road. */
export interface Near {
  /** Distance to the centre line. */
  dist: number;
  /** Road height there. */
  y: number;
  s: number;
  /** Signed sideways offset from that bit of road, right positive. */
  d: number;
}

export interface TerrainOptions {
  /** Metres around the track the ground reaches. */
  margin: number;
  cell: number;
  height(x: number, z: number, near: Near): number;
  color(x: number, z: number, h: number, near: Near, out: THREE.Color): void;
}

/** Road samples every few metres, enough to know how far any spot is from the road. */
export interface Sample {
  x: number;
  z: number;
  y: number;
  s: number;
  rx: number;
  rz: number;
}

export function coarseSamples(track: Track, every = 3): Sample[] {
  const out: Sample[] = [];
  for (let s = 0; s < track.length; s += every) {
    const f = track.frameAt(s);
    out.push({ x: f.x, z: f.z, y: f.y, s, rx: f.rx, rz: f.rz });
  }
  return out;
}

export function nearest(samples: readonly Sample[], x: number, z: number): Near {
  let best = Infinity;
  let pick = samples[0]!;
  for (const p of samples) {
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < best) {
      best = d;
      pick = p;
    }
  }
  return { dist: Math.sqrt(best), y: pick.y, s: pick.s, d: (x - pick.x) * pick.rx + (z - pick.z) * pick.rz };
}

export function trackBounds(track: Track): { minX: number; maxX: number; minZ: number; maxZ: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of track.points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  return { minX, maxX, minZ, maxZ };
}

/**
 * A height field of ground around the track, shaped per map: sand dunes
 * sloping into the sea, or a mountainside the road climbs. The height
 * and colour come from the map's own functions, which are told how far
 * each spot is from the road, so the ground always meets the road.
 */
export function buildTerrain(track: Track, options: TerrainOptions): THREE.Mesh {
  const b = trackBounds(track);
  const width = b.maxX - b.minX + options.margin * 2;
  const depth = b.maxZ - b.minZ + options.margin * 2;
  const nx = Math.ceil(width / options.cell);
  const nz = Math.ceil(depth / options.cell);
  const geo = new THREE.PlaneGeometry(width, depth, nx, nz);
  geo.rotateX(-Math.PI / 2);
  geo.translate((b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const samples = coarseSamples(track);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const near = nearest(samples, x, z);
    const h = options.height(x, z, near);
    pos.setY(i, h);
    options.color(x, z, h, near, c);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
}

/**
 * Random spots beside the road, between `min` and `max` metres from the
 * centre line of the nearest part and clear of every other part.
 */
export function scatter(track: Track, count: number, min: number, max: number, random: () => number): { x: number; z: number; y: number; s: number; side: number }[] {
  const samples = coarseSamples(track, 6);
  const out = [];
  for (let tries = 0; out.length < count && tries < count * 8; tries++) {
    const s = random() * track.length;
    const side = random() < 0.5 ? -1 : 1;
    const off = min + random() * (max - min);
    const f = track.frameAt(s);
    const x = f.x + f.rx * off * side;
    const z = f.z + f.rz * off * side;
    if (nearest(samples, x, z).dist < min - 1) continue;
    out.push({ x, z, y: f.y, s, side });
  }
  return out;
}
