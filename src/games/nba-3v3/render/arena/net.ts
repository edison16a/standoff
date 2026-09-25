import * as THREE from "three";
import type { V3 } from "../../engine/vec";
import { BALL, NET, RIM } from "../../engine/tuning";
import { netTexture } from "../textures";

const ROWS = 8;
const SEGMENTS = 24;
const BOTTOM = 0.55;

interface Ring {
  /** How far the ring has been pushed wider than rest. */
  open: number;
  openV: number;
  /** Sideways sway of the ring. */
  x: number;
  z: number;
  vx: number;
  vz: number;
  /** How far the ring has been pulled down. */
  drop: number;
  dropV: number;
}

/**
 * The net: a tapered tube of cords hanging from the rim, with each ring
 * of cords on its own spring. A ball dropping through pushes the rings
 * wide and drags them down, so a swish whips and settles, and the net
 * sways when the rim is hit.
 */
export class Net {
  readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.CylinderGeometry;
  private readonly rings: Ring[] = [];
  private readonly base: Float32Array;

  constructor() {
    this.geometry = new THREE.CylinderGeometry(RIM.radius, RIM.radius * BOTTOM, NET.depth, SEGMENTS, ROWS, true);
    this.geometry.translate(0, -NET.depth / 2, 0);
    this.base = Float32Array.from(this.geometry.getAttribute("position").array as Float32Array);
    const map = netTexture();
    map.repeat.set(1, 1);
    const material = new THREE.MeshStandardMaterial({ map, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.9, color: "#ffffff" });
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.position.set(RIM.x, RIM.y - RIM.tube, RIM.z);
    this.mesh.castShadow = true;
    for (let i = 0; i <= ROWS; i++) this.rings.push({ open: 0, openV: 0, x: 0, z: 0, vx: 0, vz: 0, drop: 0, dropV: 0 });
  }

  /** A knock from the rim: the whole net swings. */
  sway(power: number, dx: number, dz: number): void {
    this.rings.forEach((r, i) => {
      const k = i / ROWS;
      r.vx += dx * power * 0.9 * k;
      r.vz += dz * power * 0.9 * k;
    });
  }

  /** A swish: the lower net kicks back as the ball snaps through. */
  whip(power: number): void {
    this.rings.forEach((r, i) => {
      const k = i / ROWS;
      r.dropV += power * 1.6 * k;
      r.openV += power * 2.2 * k;
    });
  }

  update(dt: number, ball: V3): void {
    const h = Math.min(dt, 1 / 30);
    const bx = ball.x - RIM.x;
    const bz = ball.z - RIM.z;
    const inside = Math.hypot(bx, bz) < RIM.radius;
    this.rings.forEach((r, i) => {
      if (i === 0) return;
      const k = i / ROWS;
      const y = RIM.y - k * NET.depth - r.drop;
      // The ball inside the net pushes the ring out to fit round it and drags it down.
      if (inside && Math.abs(ball.y - y) < BALL.radius * 1.2) {
        const need = (BALL.radius * 1.05) / (RIM.radius * (1 - (1 - BOTTOM) * k)) - 1;
        if (r.open < need) {
          r.openV += (need - r.open) * 40 * h;
          r.open = Math.max(r.open, need * 0.8);
        }
        r.dropV += 60 * h;
      }
      const spring = 90;
      const damp = 5.5;
      r.openV += (-r.open * spring - r.openV * damp) * h;
      r.dropV += (-r.drop * spring * 0.6 - r.dropV * damp) * h;
      r.vx += (-r.x * spring * 0.4 - r.vx * damp * 0.6) * h;
      r.vz += (-r.z * spring * 0.4 - r.vz * damp * 0.6) * h;
      r.open += r.openV * h;
      r.drop = Math.max(-0.1, Math.min(0.25, r.drop + r.dropV * h));
      r.x += r.vx * h;
      r.z += r.vz * h;
    });
    const pos = this.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let v = 0; v < pos.count; v++) {
      const y0 = this.base[v * 3 + 1]!;
      const row = Math.round((-y0 / NET.depth) * ROWS);
      const r = this.rings[row]!;
      const s = 1 + r.open;
      arr[v * 3] = this.base[v * 3]! * s + r.x;
      arr[v * 3 + 1] = y0 - r.drop;
      arr[v * 3 + 2] = this.base[v * 3 + 2]! * s + r.z;
    }
    pos.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    const m = this.mesh.material as THREE.MeshStandardMaterial;
    m.map?.dispose();
    m.dispose();
  }
}
