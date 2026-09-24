import * as THREE from "three";
import type { Cube } from "../../engine/pickups";
import { cubeFaceTexture } from "../textures";

const TINTS = ["#ffd23f", "#6cf08a", "#c77dff", "#ffb347", "#5fd8ff", "#ff7eb6"];
const SIZE = 1.5;

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const p = new THREE.Vector3();
const s = new THREE.Vector3();

/**
 * The power up cubes: see through glass with a star on every face and a
 * glowing core, spinning and bobbing over the road. All of them are two
 * instanced meshes. A taken cube shrinks away and pops back in when it
 * returns.
 */
export class CubeView {
  readonly group = new THREE.Group();
  private readonly shell: THREE.InstancedMesh;
  private readonly core: THREE.InstancedMesh;
  /** When each cube last came back, for its pop in. */
  private readonly shownAt: number[];
  private readonly hidden: boolean[];

  constructor(private readonly cubes: readonly Cube[]) {
    const count = Math.max(1, cubes.length);
    this.shownAt = cubes.map(() => -Infinity);
    this.hidden = cubes.map(() => false);
    const shellMat = new THREE.MeshBasicMaterial({ map: cubeFaceTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    this.shell = new THREE.InstancedMesh(new THREE.BoxGeometry(SIZE, SIZE, SIZE), shellMat, count);
    const coreMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this.core = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 1), coreMat, count);
    const tint = new THREE.Color();
    cubes.forEach((_, i) => {
      tint.set(TINTS[i % TINTS.length]!);
      this.shell.setColorAt(i, tint);
      this.core.setColorAt(i, tint);
    });
    this.shell.count = this.core.count = cubes.length;
    this.shell.frustumCulled = this.core.frustumCulled = false;
    this.group.add(this.core, this.shell);
  }

  update(time: number): void {
    this.cubes.forEach((cube, i) => {
      let scale = 1;
      if (cube.respawnAt > 0) {
        scale = 0;
        this.hidden[i] = true;
      } else {
        if (this.hidden[i]) {
          this.hidden[i] = false;
          this.shownAt[i] = time;
        }
        // Pop back in with a little overshoot.
        const back = time - this.shownAt[i]!;
        if (back < 0.4) scale = Math.sin((back / 0.4) * Math.PI * 0.75) * 1.3;
      }
      const spin = time * 1.4 + i * 0.7;
      q.setFromEuler(e.set(0.5, spin, 0.35));
      p.set(cube.x, cube.y + Math.sin(time * 2.4 + i) * 0.15, cube.z);
      s.setScalar(scale);
      m.compose(p, q, s);
      this.shell.setMatrixAt(i, m);
      s.setScalar(scale * (0.85 + Math.sin(time * 6 + i) * 0.15));
      m.compose(p, q, s);
      this.core.setMatrixAt(i, m);
    });
    this.shell.instanceMatrix.needsUpdate = true;
    this.core.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    for (const mesh of [this.shell, this.core]) {
      mesh.geometry.dispose();
      (mesh.material as THREE.MeshBasicMaterial).map?.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  }
}
