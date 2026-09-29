import * as THREE from "three";
import type { SetPieceView } from "../../engine/view";
import type { Vec3 } from "../../engine/vec";

const MAX = 64;

/** A flat strip through a list of points, widened along a side direction worked out per point. */
class Ribbon {
  readonly mesh: THREE.Mesh;
  private readonly positions = new Float32Array(MAX * 2 * 3);
  private readonly geometry = new THREE.BufferGeometry();

  constructor(material: THREE.Material) {
    const index: number[] = [];
    for (let i = 0; i < MAX - 1; i++) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.geometry.setIndex(index);
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
  }

  /** `side(i)` gives the half width offset at point i. */
  set(points: readonly Vec3[], y: (p: Vec3) => number, side: (i: number) => THREE.Vector3): void {
    const n = Math.min(MAX, points.length);
    for (let i = 0; i < n; i++) {
      const p = points[i]!;
      const s = side(i);
      this.positions.set([p.x - s.x, y(p) - s.y, p.z - s.z, p.x + s.x, y(p) + s.y, p.z + s.z], i * 6);
    }
    this.geometry.attributes.position!.needsUpdate = true;
    this.geometry.setDrawRange(0, Math.max(0, n - 1) * 6);
  }

  dispose(): void {
    this.geometry.dispose();
  }
}

/**
 * The white line a set piece is lined up with: the ball's path through
 * the air, as a strip that reads from any angle, and its shadow along
 * the turf, so both the bend and the height are plain to see. It swings
 * and bends live as the taker moves the stick.
 */
export class AimLine {
  readonly group = new THREE.Group();
  private readonly air = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.92, side: THREE.DoubleSide, depthWrite: false });
  private readonly ground = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
  private readonly flat = new Ribbon(this.air);
  private readonly upright = new Ribbon(this.air);
  private readonly shadow = new Ribbon(this.ground);
  private readonly dir = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor() {
    this.group.add(this.flat.mesh, this.upright.mesh, this.shadow.mesh);
    this.group.visible = false;
  }

  update(sp: SetPieceView | null, time: number): void {
    const path = sp?.path;
    this.group.visible = !!path && path.length > 1;
    if (!path || path.length < 2) return;
    const across = (width: number) => (i: number) => {
      const a = path[Math.max(0, i - 1)]!;
      const b = path[Math.min(path.length - 1, i + 1)]!;
      this.dir.set(b.x - a.x, 0, b.z - a.z).normalize();
      return new THREE.Vector3(-this.dir.z * width, 0, this.dir.x * width);
    };
    this.flat.set(path, (p) => p.y, across(0.035));
    this.upright.set(path, (p) => p.y, () => this.up.clone().multiplyScalar(0.035));
    this.shadow.set(path, () => 0.025, across(0.05));
    // A gentle pulse so the line reads as something to act on.
    this.air.opacity = 0.8 + 0.15 * Math.sin(time * 5);
  }

  dispose(): void {
    this.flat.dispose();
    this.upright.dispose();
    this.shadow.dispose();
    this.air.dispose();
    this.ground.dispose();
  }
}
