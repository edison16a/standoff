import * as THREE from "three";
import { chopperPose } from "../engine/chopper";
import type { SurvivalGame } from "../engine/game";
import { fightFrame } from "../engine/route";
import { buildHelicopter, type Helicopter } from "./models/vehicles/helicopter";

/**
 * The rescue chopper on screen, placed from the same pure pose the
 * sound uses. It eases toward each pose so phase changes glide, and it
 * is hidden while the team rides inside it.
 */
export class ChopperView {
  private heli: Helicopter | null = null;
  private readonly at = new THREE.Vector3();

  constructor(private readonly scene: THREE.Object3D) {}

  update(game: SurvivalGame, dt: number, time: number): void {
    const pose = chopperPose(game.phase, game.stage, game.cutscene, game.phaseTime);
    if (!pose) {
      if (this.heli) this.remove();
      return;
    }
    const heli = this.heli ?? this.add();
    // From inside the cabin the model would only fill the view with its own walls.
    heli.root.visible = !pose.aboard;
    const frame = fightFrame(pose.frame);
    const spot = frame.place(pose.ahead, pose.side);
    const target = new THREE.Vector3(spot.x, frame.origin.y + pose.up, spot.z);
    // A new frame means a new place, so it jumps there rather than gliding across the city.
    const first = heli.root.userData.frame !== pose.frame;
    heli.root.userData.frame = pose.frame;
    this.at.lerp(target, first ? 1 : 1 - Math.exp(-dt * 3));
    heli.root.position.copy(this.at);
    heli.root.rotation.set(0, -frame.heading + pose.yaw, 0);
    heli.root.rotateZ(-pose.pitch);
    heli.rotor.rotation.y += dt * 26;
    heli.tailRotor.rotation.z += dt * 40;
    heli.beacons.forEach((b, i) => (b.visible = Math.sin(time * 6 + i * 2) > (i === 2 ? 0.7 : -0.2)));
    heli.searchlight.visible = !pose.aboard;
    heli.searchlight.rotation.y = Math.sin(time * 0.6) * 0.5;
  }

  private add(): Helicopter {
    this.heli = buildHelicopter();
    this.scene.add(this.heli.root);
    return this.heli;
  }

  private remove(): void {
    if (!this.heli) return;
    this.scene.remove(this.heli.root);
    // The chopper's materials are its own, made fresh each time it is built.
    this.heli.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
      if (o instanceof THREE.Sprite) o.material.dispose();
    });
    this.heli = null;
  }

  dispose(): void {
    this.remove();
  }
}
