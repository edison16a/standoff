import * as THREE from "three";
import type { Piece } from "../../engine/arena";
import type { Fighter } from "../../engine/fighter";
import { rayPieces } from "../../engine/geometry";
import { BODY } from "../../engine/tuning";
import { turnTo } from "../../engine/vec";
import { approach } from "../anim/curves";
import type { CameraPose } from "./aim-ray";

/** Where the camera sits from the fighter's eye: to the right, above and behind, metres. */
const RIGHT = 0.62;
const UP_STAND = 0.28;
/** Crouched it rises further over the eye, so the player still sees over low cover. */
const UP_CROUCH = 0.6;
const BACK = 2.25;
const PITCH = -0.07;
const FOV = 60;
/** The sniper's view narrows while it looks out, like a scope. */
const SCOPE_FOV = 40;
/** The narrowest the view may be across, degrees. */
const MIN_WIDE = 70;

/**
 * The over the shoulder camera for one player's view. It follows the way
 * the fighter faces (the brain turns them to the fight), stays clear of
 * cover by pulling in when a bunker is behind, and shows the gun's kick.
 * `pose` is the camera without the kick, which aiming uses, so recoil
 * never feeds back into where the player points.
 */
export class ShoulderCamera {
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.08, 900);
  readonly pose: CameraPose = { x: 0, y: 0, z: 0, yaw: 0, pitch: PITCH, fov: FOV, aspect: 1 };
  private yaw: number | null = null;
  private height = 0;
  private boom = BACK;
  private shake = 0;
  private deadFor = 0;

  setAspect(aspect: number): void {
    this.pose.aspect = aspect;
    if (Math.abs(this.camera.aspect - aspect) < 1e-4) return;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** A jolt, from a hit taken or a heavy shot. */
  bump(amount: number): void {
    this.shake = Math.max(this.shake, amount);
  }

  /** Jumps straight into place, for a new round. */
  snap(): void {
    this.yaw = null;
  }

  update(f: Fighter, pieces: readonly Piece[], dt: number, time: number): void {
    if (this.yaw === null) {
      this.yaw = f.look;
      this.height = eyeHeight(f.crouch);
      this.boom = BACK;
    }
    this.yaw += turnTo(this.yaw, f.look) * (1 - Math.exp(-7 * dt));
    this.height = approach(this.height, eyeHeight(f.crouch), 6, dt);
    this.deadFor = f.alive ? 0 : this.deadFor + dt;
    const out = Math.min(1, this.deadFor / 1.5);
    const yaw = this.yaw + out * 0.6;
    const back = BACK + out * 3;
    const lift = out * 2.2;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    // The pivot is over the fighter's right shoulder, nearer if cover is right there; the boom runs back from it.
    const head = { x: f.pos.x, y: this.height + lift, z: f.pos.z };
    const side = rayPieces(head, { x: -fz, y: 0, z: fx }, pieces, RIGHT + 0.25);
    const right = side ? Math.max(0, side.t - 0.25) : RIGHT;
    const pivot = { x: f.pos.x - fz * right, y: head.y, z: f.pos.z + fx * right };
    const hit = rayPieces(pivot, { x: -fx, y: 0, z: -fz }, pieces, back + 0.3);
    const room = hit ? Math.max(0.6, hit.t - 0.3) : back;
    // Pull in at once when cover gets in the way, ease back out once it has passed.
    this.boom = room < this.boom ? room : approach(this.boom, room, 3, dt);
    const scoped = f.alive && f.gun.id === "sniper" && f.brain.stance === "peek" ? 1 : 0;
    // A tall, narrow view (two players side by side) opens up so it still sees as wide.
    const wide = Math.max(1, (2 * Math.atan(Math.tan((MIN_WIDE * Math.PI) / 360) / this.pose.aspect) * 180) / Math.PI / FOV);
    this.pose.fov = approach(this.pose.fov, (FOV + (SCOPE_FOV - FOV) * scoped) * wide, 5, dt);
    this.pose.x = pivot.x - fx * this.boom;
    this.pose.y = pivot.y;
    this.pose.z = pivot.z - fz * this.boom;
    this.pose.yaw = yaw;
    this.pose.pitch = PITCH - out * 0.4;
    // The rendered camera carries part of the kick and any shake on top.
    this.shake = Math.max(0, this.shake - dt * 3);
    const jitter = this.shake * this.shake * 0.02;
    const kickPitch = f.gun.kick.pitch * 0.45 + Math.sin(time * 71) * jitter;
    const kickYaw = f.gun.kick.yaw * 0.35 + Math.sin(time * 53) * jitter;
    this.camera.position.set(this.pose.x, this.pose.y, this.pose.z);
    const p = this.pose.pitch + kickPitch;
    const y = yaw + kickYaw;
    this.camera.lookAt(this.pose.x + Math.sin(y) * Math.cos(p), this.pose.y + Math.sin(p), this.pose.z + Math.cos(y) * Math.cos(p));
    if (Math.abs(this.camera.fov - this.pose.fov) > 0.01) {
      this.camera.fov = this.pose.fov;
      this.camera.updateProjectionMatrix();
    }
  }
}

function eyeHeight(crouch: number): number {
  return BODY.standEye + UP_STAND + (BODY.crouchEye + UP_CROUCH - BODY.standEye - UP_STAND) * crouch;
}
