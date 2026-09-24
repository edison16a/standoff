import * as THREE from "three";
import { heightAlong, SEGMENTS, type Segment, type Zone } from "../../engine/route";
import { HALF_WIDTH } from "../../engine/stages";
import { MeshBuilder, type V3 } from "../mesh-builder";
import { worldMaterials } from "./materials";

/** A light in the scenery. The world lends real lights to the few nearest the camera. */
export interface Lamp {
  /** World position of the bulb. */
  at: THREE.Vector3;
  colour: number;
  /** 0 burns steady. Otherwise a seed for how it stutters. */
  flicker: number;
  halo: THREE.Sprite;
  cone: THREE.Mesh | null;
  bulb: THREE.Mesh | null;
}

export interface SegmentBuild {
  index: number;
  group: THREE.Group;
  /** Simple invisible shapes the raycast stops on: ground and walls. */
  solids: THREE.Mesh[];
  lamps: Lamp[];
  /** Per frame animation, for water, fire and the like. */
  tick?(time: number): void;
}

/** One tile of the facade texture spans this many metres: four windows of three metres. */
const TILE = 12;

/** Half the width each zone paves or clears, pavements included. Corners are filled to this. */
export const OUTER: Record<Zone, number> = {
  street: 8,
  alley: 3.4,
  park: 7,
  hospital: 12,
  ramp: 4.6,
  roof: 11,
  highway: 9.5,
  docks: 12,
};

/**
 * How far this segment's ground runs, in its own along distance. Where
 * the route turns, the segment arriving at the corner paves the whole
 * square, and the one leaving starts past it, so no two floors overlap.
 */
export function groundSpan(seg: Segment): [number, number] {
  const prev = SEGMENTS[seg.index - 2];
  const next = SEGMENTS[seg.index];
  const turnedIn = prev && Math.abs(prev.heading - seg.heading) > 1e-3;
  const turnsOut = next && Math.abs(next.heading - seg.heading) > 1e-3;
  return [turnedIn ? OUTER[prev.zone] : 0, seg.length + (turnsOut ? OUTER[next.zone] : 0)];
}

/**
 * The toolbox every zone builder uses. It works in the segment's own
 * frame: x to the right of the road, -z forward, y up from where the
 * segment starts. It merges the static detail, keeps the colliders
 * simple, and stops buildings from landing on a neighbouring road.
 */
export class SegmentKit {
  readonly b = new MeshBuilder();
  readonly group = new THREE.Group();
  readonly solids: THREE.Mesh[] = [];
  readonly lamps: Lamp[] = [];
  readonly m = worldMaterials();
  readonly rand: () => number;
  readonly hw: number;
  ticks: ((time: number) => void)[] = [];

  constructor(readonly seg: Segment) {
    let s = seg.index * 7331 + 11;
    this.rand = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    this.hw = HALF_WIDTH[seg.zone];
    this.group.position.set(seg.start.x, seg.start.y, seg.start.z);
    this.group.rotation.y = -seg.heading;
    this.group.updateMatrixWorld(true);
  }

  /** Ground height a distance along the segment, relative to its start. */
  y(along: number): number {
    return heightAlong(this.seg, Math.max(0, Math.min(this.seg.length, along))) - this.seg.start.y;
  }

  at(side: number, along: number, up = 0): V3 {
    return [side, this.y(along) + up, -along];
  }

  /** True if nothing at this spot would stand on the route's other roads. */
  free(side: number, along: number, radius: number): boolean {
    const p = new THREE.Vector3(side, 0, -along).applyMatrix4(this.group.matrixWorld);
    for (const other of SEGMENTS) {
      const gap = Math.abs(other.index - this.seg.index);
      if (gap === 0 || gap > 3) continue;
      // A neighbour running straight on shares this road, so its corridor is this one.
      if (gap === 1 && Math.abs(other.heading - this.seg.heading) < 1e-3) continue;
      const half = HALF_WIDTH[other.zone] + 2.5;
      const dx = other.end.x - other.start.x;
      const dz = other.end.z - other.start.z;
      const t = Math.max(0, Math.min(1, ((p.x - other.start.x) * dx + (p.z - other.start.z) * dz) / (dx * dx + dz * dz)));
      const d = Math.hypot(p.x - (other.start.x + dx * t), p.z - (other.start.z + dz * t));
      if (d < half + radius) return false;
    }
    return true;
  }

  /** A strip of ground that follows the segment's slope, from side x0 to x1 and along a0 to a1. */
  ground(x0: number, x1: number, a0: number, a1: number, mat: THREE.Material, uv = 4, lift = 0, collide = true): void {
    const steps = this.seg.rise ? Math.max(2, Math.ceil((a1 - a0) / 3)) : 1;
    const pos: number[] = [];
    const uvs: number[] = [];
    const index: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      for (const x of [x0, x1]) {
        pos.push(x, this.y(a) + lift, -a);
        uvs.push(x / uv, a / uv);
      }
      if (i > 0) {
        const k = i * 2;
        index.push(k - 2, k - 1, k, k - 1, k + 1, k);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(index);
    geo.computeVertexNormals();
    if (collide) this.collider(geo.clone());
    this.b.add(geo, mat);
  }

  /** A box standing on the ground with textures that tile by size, so windows keep their scale. */
  block(w: number, h: number, d: number, mat: THREE.Material, side: number, along: number, rotY = 0, sink = 0.5, collide = true, baseY?: number): void {
    const geo = new THREE.BoxGeometry(w, h, d);
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    const faces: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    faces.forEach(([fw, fh], face) => {
      for (let v = face * 4; v < face * 4 + 4; v++) uv.setXY(v, uv.getX(v) * (fw / TILE), uv.getY(v) * (fh / TILE));
    });
    const at: V3 = [side, (baseY ?? this.y(along)) + h / 2 - sink, -along];
    if (collide) {
      const box = new THREE.BoxGeometry(w, h, d);
      box.rotateY(rotY);
      box.translate(...at);
      this.collider(box);
    }
    this.b.add(geo, mat, at, [0, rotY, 0]);
  }

  collider(geo: THREE.BufferGeometry): void {
    const mesh = new THREE.Mesh(geo, this.m.collider);
    mesh.visible = false;
    this.group.add(mesh);
    mesh.updateMatrixWorld(true);
    this.solids.push(mesh);
  }

  finish(): SegmentBuild {
    const merged = this.b.build(`segment-${this.seg.index}`);
    this.group.add(merged);
    const ticks = this.ticks;
    return { index: this.seg.index, group: this.group, solids: this.solids, lamps: this.lamps, tick: ticks.length ? (t) => ticks.forEach((f) => f(t)) : undefined };
  }
}
