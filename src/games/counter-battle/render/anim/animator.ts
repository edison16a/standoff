import * as THREE from "three";
import type { CharacterId } from "../../roster";
import type { GunModel } from "../models/guns";
import type { Rig } from "../models/rig";
import type { AnimInput } from "./anim-input";
import { approach, kick, smooth } from "./curves";
import { Fall } from "./death";
import { afterShot, idleAction, reloadAction, type GunAction, type GunPoints } from "./gun-actions";
import { handPoint, holdGun } from "./hold";
import { blankLegs, blendLegs, kneelLegs, runLegs, standLegs } from "./legs";
import { blankUpper, poseArms, poseLegs, poseTorso } from "./rig-pose";
import { celebrate } from "./victory";
import { GunParts } from "./gun-parts";

const gunPos = new THREE.Vector3();
const gunQuat = new THREE.Quaternion();
const grip = new THREE.Vector3();
const want = new THREE.Vector3();
const world = new THREE.Vector3();
const leftW = new THREE.Vector3();
const rightW = new THREE.Vector3();
const turnL = new THREE.Quaternion();
const turnR = new THREE.Quaternion();
const rootQ = new THREE.Quaternion();
/** A raised fist: fingers to the sky. */
const FIST = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0));

/** How fast a hand glides to a new place, per second. */
const HAND_RATE = 20;

/**
 * Drives one fighter's rig from the engine's state each frame: legs from
 * the movement (standing, running any way, kneeling behind cover), the
 * torso turned to the aim, the gun in the hands with recoil, reloads and
 * pump or bolt work, flinches from hits, the fall on death and a
 * celebration for a win. Everything is read from the fighter, so any
 * moment of a replayed match poses the same way.
 */
export class Animator {
  private phase = 0;
  private runW = 0;
  private raise = 0.3;
  private lean = 0;
  private readonly offL = new THREE.Vector3();
  private readonly offR = new THREE.Vector3();
  private readonly legs = blankLegs();
  private readonly fall = new Fall();
  readonly parts: GunParts;
  private readonly points: GunPoints;

  constructor(readonly rig: Rig, readonly gun: GunModel, readonly character: CharacterId, private readonly seed: number, shell: THREE.Object3D | null) {
    this.parts = new GunParts(gun, rig, shell);
    const m = gun.mag?.position ?? new THREE.Vector3();
    this.points = { fore: gun.fore.toArray() as [number, number, number], handle: gun.handle.toArray() as [number, number, number], magHome: [m.x, m.y, m.z] };
  }

  /** True once the fall has begun, so the view can let go of the gun. */
  get fallen(): boolean {
    return this.fall.started;
  }

  update(a: AnimInput, dt: number, pushLocal: { x: number; z: number }): void {
    const rig = this.rig;
    const s = rig.size.s;
    rig.root.position.set(a.x, 0, a.z);
    rig.root.rotation.set(0, a.look, 0);
    if (!a.alive) {
      if (!this.fall.started) this.fall.start(rig, pushLocal, this.seed);
      this.fall.pose(rig, a.now - a.diedAt);
      return;
    }
    if (this.fall.started) this.fall.reset(rig);
    rig.root.updateMatrixWorld(true);

    // Lower body: standing, running and kneeling, blended.
    this.phase += (a.speed * dt) / (1.2 + 0.32 * a.speed);
    this.runW = approach(this.runW, Math.min(1, Math.max(0, (a.speed - 0.3) / 1.5)), 10, dt);
    this.raise = approach(this.raise, a.raise, 9, dt);
    this.lean = approach(this.lean, a.lean, 7, dt);
    const ankle = rig.size.ankle;
    const breath = Math.sin(a.now * 1.9 + this.seed);
    const kneel = smooth(a.crouch);
    blendLegs(this.legs, standLegs(s, ankle, breath), runLegs(s, ankle, this.phase, a.speed, a.dir), this.runW);
    blendLegs(this.legs, this.legs, kneelLegs(s, ankle), kneel);
    this.legs.hipX += 0.07 * s * this.lean;

    const party = a.wonAt !== null ? celebrate(this.character, a.now - a.wonAt) : null;
    const raise = party ? Math.min(this.raise, 0.3) : this.raise;
    const up = blankUpper();
    // Taller fighters hunch lower behind cover, so every head hides under the same bunkers.
    const hunch = 0.72 + (s - 0.96) * 4;
    up.bend = 0.06 + 0.16 * this.runW + hunch * kneel - a.aimPitch * 0.45 * raise + breath * 0.012;
    // Aiming, the body turns side on, left shoulder forward, and that shoulder reaches for the front of the gun.
    up.twist = (a.aimYaw * 0.75 - 0.55) * raise;
    rig.shoulderL.position.z = 0.06 * s * raise;
    up.lean = 0.24 * this.lean;
    up.headYaw = (a.aimYaw - up.twist) * 0.85 * raise;
    up.headPitch = -up.bend * 0.55 - a.aimPitch * 0.5 * raise;
    // A hit snaps the head and shoulders back and twists the body away.
    const hit = kick(a.now - a.hitAt, 0.04, 0.13);
    const side = Math.sin(a.hitAt * 97.3) > 0 ? 1 : -1;
    up.bend -= 0.25 * hit;
    up.twist += side * 0.2 * hit;
    up.lean += side * 0.1 * hit;
    up.headPitch -= 0.3 * hit;
    if (party) {
      this.legs.hipY += party.hop;
      this.legs.hipX += party.sway;
      up.bend += party.bend;
      up.twist += party.twist;
      up.lean += party.lean;
      up.headPitch += party.headPitch;
      up.headYaw += party.headYaw;
    }
    poseTorso(rig, this.legs, up);
    poseLegs(rig, this.legs);

    // The gun, then the hands on it.
    const action = this.action(a);
    holdGun(rig, this.gun, { gun: a.gun, aimYaw: a.aimYaw, aimPitch: a.aimPitch, raise, sinceShot: a.now - a.shotAt, action, party }, gunPos, gunQuat);
    this.parts.place(gunPos, gunQuat, action);
    grip.copy(gunPos);
    this.glide(this.offR, handPoint(rig, action.right, gunPos, gunQuat, want), grip, dt);
    rightW.copy(grip).add(this.offR);
    grip.copy(this.parts.forePoint(gunPos, gunQuat, action));
    const fist = party?.fist ? handPoint(rig, { space: "chest", at: party.fist }, gunPos, gunQuat, want) : null;
    this.glide(this.offL, fist ?? handPoint(rig, action.left, gunPos, gunQuat, want), grip, dt);
    leftW.copy(grip).add(this.offL);
    rig.root.localToWorld(leftW);
    rig.root.localToWorld(rightW);
    rig.root.getWorldQuaternion(rootQ);
    turnR.copy(rootQ).multiply(gunQuat).multiply(this.gun.handR);
    turnL.copy(rootQ).multiply(gunQuat).multiply(this.gun.handL);
    if (fist) turnL.copy(rootQ).multiply(FIST);
    poseArms(rig, leftW, rightW, turnL, turnR);
    this.parts.afterArms(action);
  }

  /** What the hands are busy with: a reload, or the pump or bolt after a shot. */
  private action(a: AnimInput): GunAction {
    if (a.reloading) return reloadAction(a.gun, a.reloadP, this.points, a.shellQ);
    return afterShot(a.gun, a.now - a.shotAt, this.points) ?? idleAction();
  }

  /** Eases a hand's offset from its grip toward a target, so it travels there rather than jumping. */
  private glide(off: THREE.Vector3, target: THREE.Vector3 | null, from: THREE.Vector3, dt: number): void {
    world.set(0, 0, 0);
    if (target) world.copy(target).sub(from);
    off.lerp(world, 1 - Math.exp(-HAND_RATE * dt));
  }
}
