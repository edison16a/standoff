import * as THREE from "three";
import { PUMP_TRAVEL } from "./models/bb-gun-parts";
import { createBBGun, type BBGun } from "./models/bb-gun";
import type { FinishId } from "./models/finishes";
import { Laser } from "./laser";

/**
 * The gun is drawn larger than life so it reads from across a room. With
 * fewer players each gun has more room, so it is drawn bigger still.
 */
const GUN_SCALE: Record<number, number> = { 1: 2.3, 2: 2.1, 3: 1.9, 4: 1.8 };
/** Where guns rest, relative to the camera, before anyone aims. */
const REST_TARGET = new THREE.Vector3(0, 1.7, -2);
/** How quickly a gun swings onto its player's aim, per second. */
const TURN_RATE = 16;

/** Pump stroke timing after each shot, in seconds from the trigger pull. */
const PUMP_START = 0.09;
const PUMP_BACK = 0.08;
const PUMP_HOLD = 0.04;
const PUMP_FORWARD = 0.1;

function smooth(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/** How far back the pump is, from 0 forward to 1 fully back, this long after a shot. */
export function pumpStroke(since: number): number {
  const t = since - PUMP_START;
  if (t < 0) return 0;
  if (t < PUMP_BACK) return smooth(t / PUMP_BACK);
  if (t < PUMP_BACK + PUMP_HOLD) return 1;
  return 1 - smooth((t - PUMP_BACK - PUMP_HOLD) / PUMP_FORWARD);
}

/**
 * One player's gun at the front of the screen. It swings to point at the
 * player's laser dot, kicks back when fired, puffs, and is pumped ready
 * for the next shot. Only its front half is ever in view, like the cover.
 */
export class GunRig {
  readonly object = new THREE.Group();
  readonly gun: BBGun;
  readonly laser: Laser;
  private readonly kick = new THREE.Group();
  private readonly aim = new THREE.Quaternion();
  private readonly want = new THREE.Quaternion();
  private readonly look = new THREE.Object3D();
  private readonly home = new THREE.Vector3();
  private placed = false;
  private firedAt = -Infinity;
  private recoil = 0;

  constructor(finish: FinishId, colour: string) {
    this.gun = createBBGun(finish, colour);
    this.gun.root.scale.setScalar(GUN_SCALE[1]!);
    this.kick.add(this.gun.root);
    this.object.add(this.kick);
    this.laser = new Laser(colour);
    this.aimAt(REST_TARGET, 1);
  }

  /** Its spot along the bottom of the screen. A gun already there glides over when players come or go. */
  place(position: THREE.Vector3, players: number): void {
    this.home.copy(position);
    this.gun.root.scale.setScalar(GUN_SCALE[players] ?? GUN_SCALE[4]!);
    if (!this.placed) this.object.position.copy(position);
    this.placed = true;
  }

  fire(now: number): void {
    this.firedAt = now;
    this.recoil = 1;
  }

  /** The muzzle's place in the world this frame, for puffs and the BB's flight. */
  muzzle(out: THREE.Vector3): THREE.Vector3 {
    return this.gun.muzzle.getWorldPosition(out);
  }

  /**
   * Swings toward `target` (or back to rest when the player is not aiming),
   * and plays the kick and pump. `now` and `dt` are in seconds.
   */
  update(now: number, dt: number, target: THREE.Vector3 | null): void {
    this.object.position.lerp(this.home, 1 - Math.exp(-6 * dt));
    this.aimAt(target ?? REST_TARGET, 1 - Math.exp(-TURN_RATE * dt));
    // The kick: straight back and muzzle up at once, then eased home.
    this.recoil *= Math.exp(-dt * 11);
    this.kick.position.set(0, 0.012 * this.recoil, -0.075 * this.recoil);
    this.kick.rotation.set(-0.13 * this.recoil, 0, 0);
    const stroke = pumpStroke(now - this.firedAt);
    this.gun.pump.position.z = -PUMP_TRAVEL * stroke;
    // Working the pump rocks the gun a touch.
    this.kick.rotation.z = 0.035 * Math.sin(stroke * Math.PI);
    this.object.updateMatrixWorld(true);
    this.laser.update(this.gun.laser, target, now);
  }

  dispose(): void {
    this.gun.dispose();
    this.laser.dispose();
  }

  private aimAt(target: THREE.Vector3, blend: number): void {
    this.look.position.copy(this.object.position);
    this.look.lookAt(target);
    this.want.copy(this.look.quaternion);
    this.aim.slerp(this.want, blend);
    this.object.quaternion.copy(this.aim);
  }
}
