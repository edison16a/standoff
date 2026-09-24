import * as THREE from "three";
import { disposeOwned } from "../kit/mesh-builder";
import { FESTIVE } from "../player-colours";

interface Strand {
  from: THREE.Vector3;
  to: THREE.Vector3;
  sag: number;
  flags: number;
  shift: number;
}

/**
 * Strings of triangle flags across the hall, the old strip's bunting grown
 * up. Every flag is an instance of one triangle, coloured in turn, and they
 * flutter a little as if a door had been left open.
 */
export class Bunting {
  readonly group = new THREE.Group();
  private readonly flags: THREE.InstancedMesh;
  private readonly anchors: { at: THREE.Vector3; phase: number }[] = [];
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly one = new THREE.Vector3(1, 1, 1);

  constructor() {
    const strands: Strand[] = [
      { from: new THREE.Vector3(-16, 4.1, -3.4), to: new THREE.Vector3(16, 4.1, -3.4), sag: 0.7, flags: 46, shift: 0 },
      { from: new THREE.Vector3(-16, 4.6, -4.4), to: new THREE.Vector3(16, 4.6, -4.4), sag: 0.8, flags: 46, shift: 3 },
      { from: new THREE.Vector3(-9, 6.4, 5), to: new THREE.Vector3(-9, 6.4, -10), sag: 0.9, flags: 24, shift: 1 },
      { from: new THREE.Vector3(9, 6.4, 5), to: new THREE.Vector3(9, 6.4, -10), sag: 0.9, flags: 24, shift: 4 },
    ];
    const triangle = new THREE.BufferGeometry();
    triangle.setAttribute("position", new THREE.Float32BufferAttribute([-0.16, 0, 0, 0.16, 0, 0, 0, -0.34, 0], 3));
    triangle.computeVertexNormals();
    const total = strands.reduce((sum, s) => sum + s.flags, 0);
    const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.7 });
    this.flags = new THREE.InstancedMesh(triangle, material, total);
    const colour = new THREE.Color();
    const cord = new THREE.LineBasicMaterial({ color: 0x5a4a3a });
    for (const strand of strands) {
      const at = (t: number) => strand.from.clone().lerp(strand.to, t).add(new THREE.Vector3(0, -Math.sin(Math.PI * t) * strand.sag, 0));
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 40; i++) points.push(at(i / 40));
      this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), cord));
      const along = strand.to.clone().sub(strand.from).normalize();
      const yaw = Math.atan2(-along.z, along.x);
      for (let i = 0; i < strand.flags; i++) {
        const index = this.anchors.length;
        this.anchors.push({ at: at((i + 0.5) / strand.flags), phase: yaw + i * 0.7 });
        colour.set(FESTIVE[(i + strand.shift) % FESTIVE.length]!);
        this.flags.setColorAt(index, colour);
      }
    }
    this.flags.userData.yaws = strands.flatMap((strand) => {
      const along = strand.to.clone().sub(strand.from).normalize();
      return new Array<number>(strand.flags).fill(Math.atan2(-along.z, along.x));
    });
    this.flags.frustumCulled = false;
    this.group.add(this.flags);
    this.update(0);
  }

  update(t: number): void {
    const yaws = this.flags.userData.yaws as number[];
    this.anchors.forEach((anchor, i) => {
      const flutter = Math.sin(t / 700 + anchor.phase * 3) * 0.28;
      this.q.setFromEuler(this.e.set(flutter, yaws[i]!, 0, "YXZ"));
      this.m.compose(anchor.at, this.q, this.one);
      this.flags.setMatrixAt(i, this.m);
    });
    this.flags.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    disposeOwned(this.group);
  }
}
