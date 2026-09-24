import * as THREE from "three";
import type { FencerFrame } from "@/games/fencing/engine/frames";
import type { Slot } from "@/games/fencing/players";
import { Animator } from "@/games/fencing/rig/animator";
import { blobTexture } from "../kit/textures";
import { PLAYER_COLOURS } from "../player-colours";
import { FencerModel } from "./fencer-model";

/**
 * One fencer on the strip. Every frame it turns the engine's frame into a
 * pose (the animator blends lunges and parries over the live sword), solves
 * the skeleton, and places the model. Player two is the mirror image of
 * player one, so both sword arms face the camera.
 */
export class FencerView {
  readonly group = new THREE.Group();
  private model: FencerModel | null = null;
  private readonly animator = new Animator();
  private lastT: number | null = null;
  /** The blade tip and middle in the world, for trails and sparks. */
  readonly tip = new THREE.Vector3();
  readonly mid = new THREE.Vector3();
  visible = false;
  private readonly shadow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly feet = { front: new THREE.Vector3(), back: new THREE.Vector3() };

  constructor(readonly slot: Slot) {
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: blobTexture(), transparent: true, opacity: 0.5, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.005;
    this.shadow.renderOrder = 1;
    this.group.add(this.shadow);
  }

  update(frame: FencerFrame | undefined, t: number): void {
    this.visible = Boolean(frame);
    this.group.visible = this.visible;
    if (!frame) return;
    if (this.model?.characterId !== frame.characterId) this.swap(frame);
    const model = this.model!;
    const dt = this.lastT === null ? 16 : Math.max(0, t - this.lastT);
    this.lastT = t;
    model.rig.update(this.animator.pose(frame, t));
    model.setParrying(frame.parrying, dt);
    this.group.position.x = frame.x;
    this.group.scale.set(frame.facing, 1, 1);
    // The contact shadow stretches between the feet, wide in a lunge.
    this.feet.front.copy(model.rig.bones.footF.position);
    this.feet.back.copy(model.rig.bones.footB.position);
    this.shadow.position.x = (this.feet.front.x + this.feet.back.x) / 2 + 0.05;
    this.shadow.scale.set(Math.abs(this.feet.front.x - this.feet.back.x) + 0.7, 0.55, 1);
    this.toWorld(model.rig.tip, this.tip, frame);
    this.toWorld(model.rig.mid, this.mid, frame);
  }

  dispose(): void {
    this.dropModel();
    this.shadow.geometry.dispose();
    this.shadow.material.dispose();
  }

  private dropModel(): void {
    if (this.model) this.group.remove(this.model.root);
    this.model?.dispose();
    this.model = null;
  }

  private swap(frame: FencerFrame): void {
    this.dropModel();
    this.model = new FencerModel(frame.characterId, PLAYER_COLOURS[this.slot]);
    this.group.add(this.model.root);
  }

  private toWorld(local: THREE.Vector3, out: THREE.Vector3, frame: FencerFrame): void {
    out.set(frame.x + local.x * frame.facing, local.y + this.group.position.y, local.z);
  }
}
