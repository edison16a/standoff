import * as THREE from "three";
import { playerColor } from "@/games/kit/players";
import type { Seat } from "@/platform/protocol";
import { casingSeed, ejectDelay } from "../../ballistics";
import type { GameEvent } from "../../engine/events";
import type { SurvivalGame } from "../../engine/game";
import type { WeaponId } from "../../engine/weapons";
import type { CastResult } from "../aim-caster";
import { EYE, type CameraRig } from "../camera-rig";
import type { Effects, Ejection } from "../effects/effects";
import type { FirstPerson } from "../first-person";
import { hitWeight } from "../models/zombies/hit-weight";
import type { ZombieLayer } from "../zombie-layer";
import { ShotLedger } from "./shot-ledger";

type HitEvent = Extract<GameEvent, { type: "hit" }>;

/** One bullet that struck a zombie, waiting for the engine's word on it. */
interface Strike {
  weapon: WeaponId;
  arrive: number;
  dir: THREE.Vector3;
  point: THREE.Vector3;
}

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
  zombies: ZombieLayer;
  game: () => SurvivalGame;
}

/**
 * The picture of the team's gunfire, between the engine's events and the
 * effects: the flash, smoke and flying rounds of each trigger pull, the
 * spent case thrown when the action cycles, the barrels smoking after a
 * long burst, and each zombie's flinch when a round reaches it.
 */
export class Gunfire {
  private readonly at = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();
  private readonly colour = new THREE.Color();
  private readonly strikes = new ShotLedger<Strike>();

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
    const times = effects.fire({ seat, weapon: rig.weapon, left, muzzle: this.at, dir: this.dir, colour: this.colour, eye: camera.position, rounds: results });
    view.kick(CAMERA_KICK[rig.weapon]);
    const now = this.parts.zombies.now;
    results.forEach((r, i) => {
      if (!r.hit) return;
      const dir = r.point.clone().sub(this.at).normalize();
      this.strikes.record(seat, r.hit.zombie, now, { weapon: rig.weapon, arrive: now + (times[i] ?? 0), dir, point: r.point.clone() });
    });
  }

  /**
   * The engine's hit event comes at the trigger pull. The zombie reacts
   * when the round that made it arrives, pushed along that round's path.
   * A hit with no round on record (a shot the picture never drew) lands
   * at once, straight down the view.
   */
  hit(event: HitEvent): void {
    const { zombies, game, camera } = this.parts;
    const strike = this.strikes.take(event.seat, event.zombie);
    const weapon = strike?.weapon ?? game().squad.get(event.seat)?.gun.weapon ?? "rifle";
    const weight = hitWeight(weapon, event.part, event.kind, event.blocked);
    const dir = strike?.dir ?? camera.getWorldDirection(new THREE.Vector3());
    zombies.hit(event.zombie, { dir, point: strike?.point ?? null, weight, part: event.part }, strike?.arrive ?? zombies.now);
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
