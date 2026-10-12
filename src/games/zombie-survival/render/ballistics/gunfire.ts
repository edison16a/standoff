import * as THREE from "three";
import { playerColor } from "@/games/kit/players";
import type { Seat } from "@/platform/protocol";
import { casingSeed, ejectDelay } from "../../ballistics";
import type { SurvivalGame } from "../../engine/game";
import type { WeaponId } from "../../engine/weapons";
import type { CastResult } from "../aim-caster";
import { EYE, type CameraRig } from "../camera-rig";
import type { Effects, Ejection } from "../effects/effects";
import type { FirstPerson } from "../first-person";

/**
 * How hard each gun shakes the view. The shake grows with the square of
 * this, so the light guns barely stir it and the shotgun and AK thump.
 * It stays small enough that the crosshair can still be read through a
 * burst; the held gun's own kick does the rest.
 */
const CAMERA_KICK: Record<WeaponId, number> = { shotgun: 0.12, ak47: 0.12, rifle: 0.04, smg: 0.04 };

/** What the gunfire draws with, all owned by the renderer. */
export interface GunfireParts {
  camera: THREE.Camera;
  view: CameraRig;
  guns: FirstPerson;
  effects: Effects;
  game: () => SurvivalGame;
}

/**
 * The picture of the team's gunfire, between the engine's events and the
 * effects: the flash, smoke and flying rounds of each trigger pull, the
 * spent case thrown when the action cycles, and the barrels smoking
 * after a long burst.
 */
export class Gunfire {
  private readonly at = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();
  private readonly colour = new THREE.Color();

  constructor(private readonly parts: GunfireParts) {}

  /** A trigger pull that went off, with the raycasts that found where each bullet goes. */
  shot(seat: Seat, results: readonly CastResult[]): void {
    const { guns, effects, game, camera, view } = this.parts;
    const rig = guns.rig(seat);
    if (!rig) return;
    rig.fire();
    rig.muzzle(this.at, this.dir);
    // The engine has already taken the round, so what is left now is what the shot left behind.
    const left = game().squad.get(seat)?.gun.ammo ?? 0;
    this.colour.set(playerColor(seat));
    effects.fire({ seat, weapon: rig.weapon, left, muzzle: this.at, dir: this.dir, colour: this.colour, eye: camera.position, rounds: results });
    view.kick(CAMERA_KICK[rig.weapon]);
  }

  /**
   * The engine's shot event: the spent case leaves the port when the
   * action cycles, at once for the automatics and on the pump stroke for
   * the shotgun. Its seed is the one the sound uses for its clinks.
   */
  eject(seat: Seat, weapon: WeaponId, shotId: number): void {
    this.parts.effects.eject(weapon, casingSeed(seat, shotId), ejectDelay(weapon), () => this.port(seat, weapon));
  }

  /** Each frame: every hot barrel trails its wisp from wherever the gun now points. */
  barrels(seats: readonly Seat[], dt: number): void {
    for (const seat of seats) {
      const rig = this.parts.guns.rig(seat);
      if (!rig) continue;
      rig.muzzle(this.at, this.dir);
      this.parts.effects.barrel(seat, this.at, dt);
    }
  }

  /**
   * Where a gun's port is in the world right now. Guns ride the camera,
   * so the port is read in world space at the moment of ejection and the
   * case lives in the world from then on.
   */
  private port(seat: Seat, weapon: WeaponId): Ejection | null {
    const rig = this.parts.guns.rig(seat);
    if (!rig || rig.weapon !== weapon || !rig.holder.visible) return null;
    const ejector = rig.model.ejector;
    const port = ejector.getWorldPosition(new THREE.Vector3());
    const right = new THREE.Vector3().setFromMatrixColumn(ejector.matrixWorld, 0).normalize();
    return { port, right, ground: this.parts.camera.position.y - EYE };
  }
}
