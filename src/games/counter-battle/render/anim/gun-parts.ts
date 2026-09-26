import * as THREE from "three";
import type { GunModel } from "../models/guns";
import type { Rig } from "../models/rig";
import type { GunAction } from "./gun-actions";

/** How far the pump slides back and the charging handle or bolt comes back, metres. */
const PUMP_TRAVEL = 0.09;
const BOLT_TRAVEL = 0.07;

const v = new THREE.Vector3();
const q = new THREE.Quaternion();
const q2 = new THREE.Quaternion();
const IN_HAND = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0, 0));

/**
 * The gun in the fighter's hands and its moving parts: the pump and the
 * bolt slide, the magazine drops out and is carried in the left hand, a
 * shell rides in the hand while the shotgun loads.
 */
export class GunParts {
  private readonly magHome: THREE.Vector3;
  private readonly pumpHome: THREE.Vector3;
  private readonly boltHome: THREE.Vector3;

  constructor(readonly gun: GunModel, readonly rig: Rig, readonly shell: THREE.Object3D | null) {
    this.magHome = gun.mag?.position.clone() ?? new THREE.Vector3();
    this.pumpHome = gun.pump?.position.clone() ?? new THREE.Vector3();
    this.boltHome = gun.bolt?.position.clone() ?? new THREE.Vector3();
    if (gun.root.parent !== rig.root) rig.root.add(gun.root);
    if (shell) {
      shell.visible = false;
      rig.handL.add(shell);
    }
  }

  /** Sets the gun's place in the root's space and slides its parts for the action. */
  place(pos: THREE.Vector3, quat: THREE.Quaternion, a: GunAction): void {
    const g = this.gun;
    g.root.position.copy(pos);
    g.root.quaternion.copy(quat);
    if (g.pump) g.pump.position.set(this.pumpHome.x, this.pumpHome.y, this.pumpHome.z - PUMP_TRAVEL * a.pump);
    if (g.bolt) {
      g.bolt.position.set(this.boltHome.x, this.boltHome.y, this.boltHome.z - BOLT_TRAVEL * a.bolt);
      g.bolt.rotation.set(0, 0, -1.1 * a.boltUp);
    }
    if (g.mag) {
      g.mag.visible = !a.magHidden;
      g.mag.position.set(this.magHome.x, this.magHome.y - a.magOut, this.magHome.z);
      g.mag.quaternion.identity();
    }
    if (this.shell) this.shell.visible = a.shellInHand;
    g.root.updateMatrixWorld(true);
  }

  /** Where the left hand holds the front of the gun, in the root's space, riding the pump. */
  forePoint(pos: THREE.Vector3, quat: THREE.Quaternion, a: GunAction): THREE.Vector3 {
    const f = this.gun.fore;
    return v.set(f.x, f.y, f.z - (this.gun.pump ? PUMP_TRAVEL * a.pump : 0)).applyQuaternion(quat).add(pos);
  }

  /** Once the hands are posed: a magazine being swapped follows the left hand. */
  afterArms(a: GunAction): void {
    const mag = this.gun.mag;
    if (!mag || !a.magInHand) return;
    const hand = this.rig.handL;
    hand.updateMatrixWorld(true);
    v.set(0, -0.06, 0.03).applyMatrix4(hand.matrixWorld);
    this.gun.root.worldToLocal(v);
    mag.position.copy(v);
    // The hand's world turn, taken into the gun's frame.
    hand.getWorldQuaternion(q).multiply(IN_HAND);
    this.gun.root.getWorldQuaternion(q2);
    mag.quaternion.copy(q2.invert().multiply(q));
  }

  /** The gun leaves the hands: back to the scene at its world pose, for the view to drop. */
  detach(scene: THREE.Object3D): void {
    scene.attach(this.gun.root);
  }

  /** Back into the hands for a new round. */
  reattach(): void {
    if (this.gun.root.parent !== this.rig.root) this.rig.root.add(this.gun.root);
  }
}
