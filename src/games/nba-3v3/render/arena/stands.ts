import * as THREE from "three";
import { Bake } from "./bake";
import { seatChair } from "./fan-geometry";
import { ROW_DEPTH, ROW_RISE, treadY, type Section, type Seat } from "./seat-layout";

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const one = new THREE.Vector3(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0);

/**
 * The stands under the fans: the stepped concrete risers with a pale
 * nosing along each step, a seat at every place (the empty ones show),
 * and small warm lights at the foot of each aisle step, which is what
 * makes a dark bowl read as rows of seats on television. Five draws.
 */
export class Stands {
  readonly group = new THREE.Group();
  private readonly owned: THREE.Material[] = [];

  constructor(sections: readonly Section[], seats: readonly Seat[], aisles: readonly { x: number; z: number; yaw: number; rows: number }[]) {
    const riser = new THREE.MeshStandardMaterial({ color: "#161a2a", roughness: 0.92 });
    const nosing = new THREE.MeshStandardMaterial({ color: "#59607a", roughness: 0.7 });
    const bake = new Bake();
    for (const s of sections) {
      const fx = Math.sin(s.yaw);
      const fz = Math.cos(s.yaw);
      for (let row = 0; row < s.rows; row++) {
        const back = row * ROW_DEPTH + ROW_DEPTH / 2;
        const y = treadY(row);
        const cx = s.x - fx * back;
        const cz = s.z - fz * back;
        bake.add(new THREE.BoxGeometry(s.width + 1, y + 0.1, ROW_DEPTH), riser, { x: cx, y: (y + 0.1) / 2 - 0.1, z: cz, ry: s.yaw });
        // The nosing: a pale strip along the front edge of each step.
        bake.add(new THREE.BoxGeometry(s.width + 1, 0.035, 0.05), nosing, { x: cx + fx * (ROW_DEPTH / 2 - 0.02), y: y + 0.005, z: cz + fz * (ROW_DEPTH / 2 - 0.02), ry: s.yaw });
      }
    }
    const built = bake.build(false);
    for (const mesh of built) mesh.receiveShadow = true;
    this.group.add(...built);
    this.owned.push(riser, nosing);

    // A seat at every place; the fans sit in most of them.
    const chairMat = new THREE.MeshLambertMaterial({ color: "#2b3150" });
    const chairs = new THREE.InstancedMesh(seatChair(), chairMat, seats.length);
    seats.forEach((s, i) => chairs.setMatrixAt(i, m.compose(p.set(s.x, s.y, s.z), q.setFromAxisAngle(UP, s.yaw), one)));
    chairs.frustumCulled = false;
    this.group.add(chairs);
    this.owned.push(chairMat);

    // Step lights: a small warm lamp at each side of every aisle step.
    const lamps: THREE.Matrix4[] = [];
    for (const a of aisles) {
      const fx = Math.sin(a.yaw);
      const fz = Math.cos(a.yaw);
      const rx = Math.cos(a.yaw);
      const rz = -Math.sin(a.yaw);
      for (let row = 0; row < a.rows; row++) {
        const back = row * ROW_DEPTH - 0.006;
        for (const side of [-0.48, 0.48]) {
          lamps.push(new THREE.Matrix4().compose(p.set(a.x + rx * side - fx * back, treadY(row) - ROW_RISE * 0.5, a.z + rz * side - fz * back), q.setFromAxisAngle(UP, a.yaw), one));
        }
      }
    }
    // Brighter than white, so the finish gives each one a small glow.
    const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd9a0").multiplyScalar(2.2) });
    const lights = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.1, 0.05), lampMat, Math.max(1, lamps.length));
    lamps.forEach((l, i) => lights.setMatrixAt(i, l));
    lights.count = lamps.length;
    lights.frustumCulled = false;
    this.group.add(lights);
    this.owned.push(lampMat);
  }

  dispose(): void {
    for (const mat of this.owned) mat.dispose();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
}
