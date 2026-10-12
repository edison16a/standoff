import * as THREE from "three";
import { gunMaterials } from "../models/guns/gun-kit";
import { fallAt, magazineFall } from "./falling";
import type { V3 } from "./pose";

/** Long enough to fall well off the bottom of the screen. */
const LIFETIME = 1;

interface Falling {
  object: THREE.Object3D;
  fall: ReturnType<typeof magazineFall>;
  t: number;
  from: THREE.Vector3;
  turn: THREE.Quaternion;
}

const inverse = new THREE.Matrix4();
const local = new THREE.Matrix4();
const scale = new THREE.Vector3();
const spin = new THREE.Quaternion();
const euler = new THREE.Euler();
const axis = new THREE.Vector3();

/**
 * Empty magazines on their way to the ground. Each is a copy of the gun's
 * own magazine, cut loose into the frame of the gun's resting place, so
 * it keeps falling however the gun swings or comes back up to aim.
 */
export class Debris {
  readonly group = new THREE.Group();
  private readonly items: Falling[] = [];

  constructor(private readonly random: () => number) {}

  /**
   * Drops a copy of `source` from where it is now. `down` is gravity in
   * this group's frame. The copy shares the source's geometry, so it is
   * only removed, never disposed, when it is done.
   */
  drop(source: THREE.Object3D, down: V3): void {
    const object = source.clone();
    object.visible = true;
    // The round on top went into the gun: an empty magazine shows its follower.
    object.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material === gunMaterials().brass) o.visible = false;
    });
    this.group.updateMatrixWorld(true);
    local.multiplyMatrices(inverse.copy(this.group.matrixWorld).invert(), source.matrixWorld);
    const from = new THREE.Vector3();
    const turn = new THREE.Quaternion();
    local.decompose(from, turn, scale);
    // It leaves along its own length, out of the bottom of the well.
    axis.set(0, -1, 0).applyQuaternion(turn);
    const fall = magazineFall(down, [axis.x, axis.y, axis.z], this.random);
    object.position.copy(from);
    object.quaternion.copy(turn);
    this.group.add(object);
    this.items.push({ object, fall, t: 0, from, turn });
  }

  update(dt: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i]!;
      item.t += dt;
      if (item.t > LIFETIME) {
        this.group.remove(item.object);
        this.items.splice(i, 1);
        continue;
      }
      const { offset, turn } = fallAt(item.fall, item.t);
      item.object.position.set(item.from.x + offset[0], item.from.y + offset[1], item.from.z + offset[2]);
      item.object.quaternion.copy(item.turn).multiply(spin.setFromEuler(euler.set(...turn)));
    }
  }

  clear(): void {
    for (const item of this.items) this.group.remove(item.object);
    this.items.length = 0;
  }
}
