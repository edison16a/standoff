import * as THREE from "three";
import { playerColor } from "@/games/kit/players";
import type { Seat } from "@/platform/protocol";
import type { WeaponId } from "../engine/weapons";
import { Laser } from "./effects/laser";
import { gunSlotX } from "./gun-layout";
import { GunRig } from "./gun-rig";

export interface Shooter {
  seat: Seat;
  weapon: WeaponId;
  /** Where the player's laser lands in the world, or null when they are not aiming. */
  aim: THREE.Vector3 | null;
}

/** Guns sit this far in front of the eye, in metres. */
const DEPTH = 0.5;

/**
 * The team's guns along the bottom of the screen, each with its laser
 * sight. Guns are children of the camera, so they stay put on screen as
 * the view walks and turns, and each swings to its own player's aim.
 */
export class FirstPerson {
  readonly group = new THREE.Group();
  readonly lasers = new THREE.Group();
  private readonly rigs = new Map<Seat, { rig: GunRig; laser: Laser }>();

  constructor(private readonly camera: THREE.PerspectiveCamera) {
    camera.add(this.group);
  }

  rig(seat: Seat): GunRig | undefined {
    return this.rigs.get(seat)?.rig;
  }

  update(shooters: readonly Shooter[], dt: number, time: number, visible: boolean): void {
    const seen = new Set<Seat>();
    const halfH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * DEPTH;
    const halfW = halfH * this.camera.aspect;
    shooters.forEach((shooter, index) => {
      seen.add(shooter.seat);
      let entry = this.rigs.get(shooter.seat);
      if (entry && entry.rig.weapon !== shooter.weapon) {
        this.drop(shooter.seat);
        entry = undefined;
      }
      if (!entry) {
        entry = { rig: new GunRig(shooter.weapon), laser: new Laser(playerColor(shooter.seat)) };
        this.group.add(entry.rig.holder);
        this.lasers.add(entry.laser.group);
        this.rigs.set(shooter.seat, entry);
      }
      const { rig, laser } = entry;
      // Spread along the bottom edge, pulled in a little on wide screens.
      const x = gunSlotX(index, shooters.length) * Math.min(halfW, halfH * 1.9) * 0.82;
      rig.place(x, -halfH * 1.02, -DEPTH * 0.86);
      const aimLocal = shooter.aim ? this.camera.worldToLocal(shooter.aim.clone()) : new THREE.Vector3(x * 0.5, 0, -20);
      rig.pointAt(aimLocal);
      rig.update(dt, time + shooter.seat);
      rig.holder.visible = visible;
      rig.holder.updateMatrixWorld(true);
      const from = rig.laserOrigin(new THREE.Vector3());
      laser.update(from, visible ? shooter.aim : null, this.camera.position, time);
    });
    for (const seat of [...this.rigs.keys()]) if (!seen.has(seat)) this.drop(seat);
  }

  dispose(): void {
    for (const seat of [...this.rigs.keys()]) this.drop(seat);
    this.camera.remove(this.group);
  }

  private drop(seat: Seat): void {
    const entry = this.rigs.get(seat);
    if (!entry) return;
    this.group.remove(entry.rig.holder);
    this.lasers.remove(entry.laser.group);
    entry.rig.dispose();
    entry.laser.dispose();
    this.rigs.delete(seat);
  }
}
