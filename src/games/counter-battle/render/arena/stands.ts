import * as THREE from "three";
import { box, capsule, ball, cone, cyl, merge, paint, shade } from "../geo";
import { FIELD_COLOURS as C } from "../palette";
import { GROUND } from "../textures";

const SHIRTS = ["#ff3fc8", "#16d9ff", "#f4f6f1", "#ffd166", "#23262d", "#b8f400", "#ef476f", "#7b61ff", "#f97316"];
const SKIN = ["#f1c7a5", "#d9a47c", "#a86f4c", "#6e4630", "#e8b995"];

/**
 * The crowd side of the field: steel bleachers packed with fans along
 * one long side, and the pits along the other, pop up tents in the team
 * colours with gear tables. The fans bob and cheer as a group, one draw.
 */
export class Stands {
  readonly group = new THREE.Group();
  private readonly fans: THREE.InstancedMesh;
  private readonly seats: { x: number; y: number; z: number; phase: number }[] = [];
  private readonly owned: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = [];
  private readonly matrix = new THREE.Matrix4();
  private excitement = 0;

  constructor() {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.1 });
    const x0 = GROUND.halfWidth + 2;
    const rows = 7;
    const length = GROUND.halfLength * 1.5;
    const parts: THREE.BufferGeometry[] = [];
    for (let r = 0; r < rows; r++) {
      const x = x0 + r * 0.9;
      const y = 0.45 + r * 0.5;
      parts.push(paint(box(0.8, 0.08, length), r % 2 ? "#9aa3ad" : "#c3cad2", { at: [x, y, 0] }));
      parts.push(paint(box(0.06, y, length), "#5c6570", { at: [x + 0.4, y / 2, 0] }));
      for (let z = -length / 2 + 1; z < length / 2; z += 0.7) this.seats.push({ x: x - 0.05, y: y + 0.04, z: z + (r % 2) * 0.3, phase: z * 1.3 + r * 2.1 });
    }
    // A back rail and the lime banner along the front.
    parts.push(paint(box(0.08, 1, length), "#5c6570", { at: [x0 + rows * 0.9 - 0.4, 0.45 + rows * 0.5 + 0.5, 0] }));
    parts.push(paint(box(0.05, 0.9, length), C.lime, { at: [x0 - 0.5, 0.45, 0] }));
    this.addMesh(merge(parts), mat, true);
    this.addMesh(merge(this.pits()), mat, true);

    // One fan: a body and a head, coloured per instance.
    const fan = merge([paint(capsule(0.2, 0.45), "#ffffff", { at: [0, 0.45, 0] }), paint(ball(0.13, 10, 8), "#ffffff", { at: [0, 0.98, 0] })]);
    const fanMat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
    this.fans = new THREE.InstancedMesh(fan, fanMat, this.seats.length);
    this.owned.push({ geometry: fan, material: fanMat });
    const col = new THREE.Color();
    this.seats.forEach((s, i) => {
      // Mostly shirts, with a few faces showing through when seen from afar.
      col.set(i % 7 === 0 ? SKIN[i % SKIN.length]! : SHIRTS[(i * 7 + (i >> 3)) % SHIRTS.length]!);
      this.fans.setColorAt(i, col);
    });
    this.group.add(this.fans);
    this.update(0);
  }

  private addMesh(geometry: THREE.BufferGeometry, material: THREE.Material, shadows: boolean): void {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    this.group.add(mesh);
    this.owned.push({ geometry, material });
  }

  /** The pits: a row of canopy tents, each over a table of gear. */
  private pits(): THREE.BufferGeometry[] {
    const parts: THREE.BufferGeometry[] = [];
    const x = -GROUND.halfWidth - 4;
    for (let i = 0; i < 5; i++) {
      const z = -18 + i * 9;
      const colour = i % 2 ? "#16d9ff" : "#ff3fc8";
      parts.push(paint(cone(2.3, 0.9, 4), colour, { at: [x, 3, z], rot: [0, Math.PI / 4, 0] }));
      parts.push(paint(box(3.2, 0.3, 3.2), shade(colour, -0.25), { at: [x, 2.45, z] }));
      for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]] as const) parts.push(paint(cyl(0.035, 0.035, 2.5, 6), "#d7dde3", { at: [x + dx, 1.25, z + dz] }));
      parts.push(paint(box(2, 0.06, 0.8), "#e7e1d6", { at: [x, 0.8, z] }));
      parts.push(paint(box(0.06, 0.8, 0.7), "#6b7280", { at: [x - 0.9, 0.4, z] }));
      parts.push(paint(box(0.06, 0.8, 0.7), "#6b7280", { at: [x + 0.9, 0.4, z] }));
      // Pods and a hopper on the table.
      for (let k = 0; k < 4; k++) parts.push(paint(cyl(0.05, 0.05, 0.22, 8), k % 2 ? C.lime : colour, { at: [x - 0.6 + k * 0.3, 0.94, z - 0.1] }));
      parts.push(paint(box(0.5, 0.3, 0.35), C.charcoal, { at: [x + 0.5, 0.98, z + 0.1] }));
    }
    return parts;
  }

  /** How loud the fans are, 0 to 1. They jump higher when it is up. */
  cheer(amount: number): void {
    this.excitement = Math.max(this.excitement, amount);
  }

  update(time: number, dt = 0): void {
    this.excitement = Math.max(0.15, this.excitement - dt * 0.35);
    const hop = this.excitement;
    this.seats.forEach((s, i) => {
      const bob = Math.max(0, Math.sin(time * 6 + s.phase)) * 0.12 * hop;
      this.matrix.makeTranslation(s.x, s.y + bob, s.z);
      this.fans.setMatrixAt(i, this.matrix);
    });
    this.fans.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    for (const { geometry, material } of this.owned) {
      geometry.dispose();
      material.dispose();
    }
  }
}
