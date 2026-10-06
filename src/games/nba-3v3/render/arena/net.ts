import * as THREE from "three";
import type { V3 } from "../../engine/vec";
import { BALL, NET, RIM } from "../../engine/tuning";
import { angle, LOOPS, NetSim } from "./net-sim";

/** A cord's thickness. A real net cord is about 5 mm; a little more reads better from the broadcast camera. */
const CORD = 0.0042;
const SIDES = 3;
/** Two cloth steps a 60 Hz frame. */
const SUB = 2;
/** The hooks hang from the bottom of the drawn ring. */
const HOOK_Y = -RIM.tube * 1.6;

const local = new THREE.Vector3();
const hookAt = new THREE.Vector3();

/**
 * The net: every cord drawn as a thin three sided tube between knots of
 * a cloth simulation (see `net-sim.ts`), rebuilt each frame. It hangs
 * from the twelve hooks under the ring and moves with the ring when it
 * flexes. The ball drops through it, so a swish whips it, a ball that
 * rattles in drags it, and a knock on the iron swings it.
 */
export class Net {
  readonly mesh: THREE.Mesh;
  private readonly sim = new NetSim({ origin: { x: RIM.x, y: RIM.y + HOOK_Y, z: RIM.z }, radius: RIM.radius, depth: NET.depth, taper: 0.4 });
  private readonly geometry = new THREE.BufferGeometry();
  private readonly positions: Float32Array;
  private readonly normals: Float32Array;

  constructor() {
    const cords = this.sim.cords.length / 2;
    this.positions = new Float32Array(cords * SIDES * 2 * 3);
    this.normals = new Float32Array(cords * SIDES * 2 * 3);
    const index: number[] = [];
    for (let c = 0; c < cords; c++) {
      const base = c * SIDES * 2;
      for (let s = 0; s < SIDES; s++) {
        const a = base + s;
        const b = base + ((s + 1) % SIDES);
        index.push(a, b, a + SIDES, b, b + SIDES, a + SIDES);
      }
    }
    this.geometry.setIndex(index);
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("normal", new THREE.BufferAttribute(this.normals, 3).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.MeshStandardMaterial({ color: "#f3f2ee", roughness: 0.9, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    // Let it settle into its hang before the first frame is seen.
    for (let i = 0; i < 240; i++) this.sim.step(1 / 120, 0, -99, 0, BALL.radius);
    this.build();
  }

  /** A knock from the rim: the whole net swings away from where the ball hit. */
  sway(power: number, dx: number, dz: number): void {
    this.sim.kick(dx * power * 0.9, 0, dz * power * 0.9, 0, 1 / 60);
  }

  /** A swish or a dunk: the lower net kicks down and out as the ball snaps through. */
  whip(power: number): void {
    this.sim.kick(0, -power * 1.6, 0, power * 1.2, 1 / 60);
  }

  /**
   * Steps the cloth with the hooks wherever `ring` (the ring's matrix in
   * the net's space) has them, and the ball, given in the net's space.
   */
  update(dt: number, ball: V3, ring: THREE.Matrix4): void {
    for (let i = 0; i < LOOPS; i++) {
      const a = angle(0, i);
      hookAt.set(Math.cos(a) * RIM.radius, HOOK_Y, Math.sin(a) * RIM.radius).applyMatrix4(ring);
      this.sim.hook(i, hookAt.x, hookAt.y, hookAt.z);
    }
    const h = Math.min(dt, 1 / 30) / SUB;
    if (h <= 0) return;
    local.set(ball.x, ball.y, ball.z);
    for (let s = 0; s < SUB; s++) this.sim.step(h, local.x, local.y, local.z, BALL.radius + CORD);
    this.build();
  }

  /** Lays a thin tube along every cord. */
  private build(): void {
    const p = this.sim.pos;
    const cords = this.sim.cords;
    const out = this.positions;
    const nor = this.normals;
    for (let c = 0; c < cords.length / 2; c++) {
      const a = cords[c * 2]! * 3;
      const b = cords[c * 2 + 1]! * 3;
      let dx = p[b]! - p[a]!;
      let dy = p[b + 1]! - p[a + 1]!;
      let dz = p[b + 2]! - p[a + 2]!;
      const l = Math.hypot(dx, dy, dz) || 1;
      dx /= l;
      dy /= l;
      dz /= l;
      // Two directions square to the cord: across it in the floor plane, and the one square to both.
      const ul = Math.hypot(dx, dz);
      // A cord hanging dead straight down has no across in the floor plane, so any level direction does.
      const ux = ul > 1e-3 ? -dz / ul : 1;
      const uz = ul > 1e-3 ? dx / ul : 0;
      const vx = dy * uz;
      const vy = dz * ux - dx * uz;
      const vz = -dy * ux;
      for (let s = 0; s < SIDES; s++) {
        const t = (s / SIDES) * Math.PI * 2;
        const nx = Math.cos(t) * ux + Math.sin(t) * vx;
        const ny = Math.sin(t) * vy;
        const nz = Math.cos(t) * uz + Math.sin(t) * vz;
        for (const [end, k] of [[a, 0], [b, SIDES]] as const) {
          const o = ((c * SIDES * 2) + s + k) * 3;
          out[o] = p[end]! + nx * CORD;
          out[o + 1] = p[end + 1]! + ny * CORD;
          out[o + 2] = p[end + 2]! + nz * CORD;
          nor[o] = nx;
          nor[o + 1] = ny;
          nor[o + 2] = nz;
        }
      }
    }
    this.geometry.attributes.position!.needsUpdate = true;
    this.geometry.attributes.normal!.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
