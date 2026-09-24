import * as THREE from "three";
import { chopperPose } from "../engine/chopper";
import type { SurvivalGame } from "../engine/game";
import { fightFrame } from "../engine/route";
import { CHOPPER_STAGE } from "../engine/stages";
import type { Effects } from "./effects/effects";
import { buildHelicopter, type Helicopter } from "./models/vehicles/helicopter";

/**
 * The rescue chopper on screen, placed from the same pure pose the
 * sound uses. It eases toward each pose so phase changes glide, smokes
 * and burns as the engine fails, and leaves a burning wreck below the
 * roof after the crash.
 */
export class ChopperView {
  private heli: Helicopter | null = null;
  private readonly at = new THREE.Vector3();
  private exploded = false;
  private puffClock = 0;

  constructor(
    private readonly scene: THREE.Object3D,
    private readonly effects: Effects,
  ) {}

  update(game: SurvivalGame, dt: number, time: number): void {
    const pose = chopperPose(game.phase, game.stage, game.cutscene, game.phaseTime);
    if (!pose) {
      if (this.heli) this.remove();
      this.exploded = false;
      return;
    }
    const heli = this.heli ?? this.add();
    const frame = fightFrame(CHOPPER_STAGE);
    const spot = frame.place(pose.ahead, pose.side);
    const target = new THREE.Vector3(spot.x, frame.origin.y + pose.up, spot.z);
    const first = heli.root.userData.placed !== true;
    heli.root.userData.placed = true;
    this.at.lerp(target, first || pose.failing > 0 ? 1 : 1 - Math.exp(-dt * 1.5));
    if (first) this.at.copy(target);
    heli.root.position.copy(this.at);
    heli.root.rotation.set(0, -frame.heading + pose.yaw, 0);
    heli.root.rotateZ(-pose.pitch);
    heli.rotor.rotation.y += dt * (pose.crashed === null ? 26 - pose.failing * 14 : 0);
    heli.tailRotor.rotation.z += dt * (pose.crashed === null ? 40 : 0);
    heli.beacons.forEach((b, i) => (b.visible = pose.crashed === null && Math.sin(time * 6 + i * 2) > (i === 2 ? 0.7 : -0.2)));
    heli.searchlight.visible = pose.failing < 0.5 && pose.crashed === null;
    heli.searchlight.rotation.y = Math.sin(time * 0.6) * 0.5;

    this.puffClock -= dt;
    if ((pose.failing > 0 || pose.crashed !== null) && this.puffClock <= 0) {
      this.puffClock = pose.crashed === null ? 0.04 : 0.12;
      const exhaust = heli.exhaust.getWorldPosition(new THREE.Vector3());
      this.effects.puff(exhaust, true);
    }
    if (pose.crashed !== null && !this.exploded) {
      this.exploded = true;
      // A wreck seen long after the crash just smoulders.
      if (pose.crashed < 1) this.effects.explosion(this.at.clone());
    }
  }

  private add(): Helicopter {
    this.heli = buildHelicopter();
    this.heli.root.userData.placed = false;
    this.scene.add(this.heli.root);
    return this.heli;
  }

  private remove(): void {
    if (!this.heli) return;
    this.scene.remove(this.heli.root);
    this.heli.root.traverse((o) => o instanceof THREE.Mesh && o.geometry.dispose());
    this.heli = null;
  }

  dispose(): void {
    this.remove();
  }
}
