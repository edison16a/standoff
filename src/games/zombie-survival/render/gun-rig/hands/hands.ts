import * as THREE from "three";
import { MeshBuilder } from "../../mesh-builder";
import type { HandPose } from "../pose";
import { handMaterials } from "./hand-materials";
import { HandModel, WRIST, type Side } from "./hand-model";

/** Forearm length drawn past the cuff. Running down, it leaves the bottom of the screen long before it ends. */
const FOREARM = 0.26;

/**
 * A forearm along +z from the wrist: a band of skin above the glove, the
 * sleeve's cuff in the player's colour, and the sleeve widening toward
 * the elbow with a couple of folds.
 */
function forearm(cuff: THREE.Material): THREE.Group {
  const m = handMaterials();
  const b = new MeshBuilder();
  const along = (radius: number, length: number, z: number, material: THREE.Material, end = radius) =>
    b.add(new THREE.CylinderGeometry(radius, end, length, 14), material, [0, 0, z], [-Math.PI / 2, 0, 0], [1.12, 1, 0.9]);
  // A slim, rolled up sleeve: less cloth between the camera and the guns.
  along(0.025, 0.03, 0.012, m.skin, 0.026);
  along(0.032, 0.024, 0.034, cuff);
  along(0.033, FOREARM, 0.046 + FOREARM / 2, m.sleeve, 0.04);
  for (const z of [0.08, 0.13]) b.add(new THREE.TorusGeometry(0.034 + z * 0.03, 0.004, 6, 16), m.sleeve, [0, 0, z], [0, 0, 0], [1.12, 0.9, 1]);
  return b.build("forearm");
}

/** One arm: the hand, posed from a HandPose, and the forearm that follows it. */
class Arm {
  readonly hand: HandModel;
  readonly forearm: THREE.Group;
  private readonly wrist = new THREE.Vector3();

  constructor(side: Side, cuff: THREE.Material) {
    this.hand = new HandModel(side);
    this.forearm = forearm(cuff);
  }

  /** Puts the hand where the pose says, then lays the forearm from its wrist along `line`, a unit vector. */
  apply(pose: HandPose, line: THREE.Vector3): void {
    const { root } = this.hand;
    root.position.set(...pose.pos);
    root.rotation.set(...pose.rot);
    this.hand.shape(pose.curl, pose.index, pose.thumb);
    root.updateMatrix();
    this.wrist.set(...WRIST).applyMatrix4(root.matrix);
    this.forearm.position.copy(this.wrist);
    // A cylinder looks the same however it twists, so the shortest turn onto the line is enough.
    this.forearm.quaternion.setFromUnitVectors(PLUS_Z, line);
  }

  dispose(): void {
    this.hand.dispose();
    this.forearm.traverse((o) => o instanceof THREE.Mesh && o.geometry.dispose());
  }
}

const PLUS_Z = new THREE.Vector3(0, 0, 1);

/**
 * The player's two hands and forearms, held in the gun's frame. The right
 * hand holds the grip with its finger by the trigger; the left holds the
 * handguard or the pump and leaves it to do the reload's work.
 */
export class Hands {
  readonly group = new THREE.Group();
  readonly support: Arm;
  readonly grip: Arm;
  private readonly cuff: THREE.MeshStandardMaterial;

  constructor(colour: THREE.ColorRepresentation) {
    // Each player's sleeve cuffs carry their colour, so a glance finds whose gun is whose.
    this.cuff = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.8, metalness: 0 });
    this.support = new Arm("left", this.cuff);
    this.grip = new Arm("right", this.cuff);
    for (const arm of [this.support, this.grip]) this.group.add(arm.hand.root, arm.forearm);
  }

  /** Poses both arms. Forearm lines are unit vectors in the gun's frame, where the hands are. */
  apply(support: HandPose, grip: HandPose, supportLine: THREE.Vector3, gripLine: THREE.Vector3): void {
    this.support.apply(support, supportLine);
    this.grip.apply(grip, gripLine);
  }

  dispose(): void {
    this.support.dispose();
    this.grip.dispose();
    this.cuff.dispose();
  }
}
