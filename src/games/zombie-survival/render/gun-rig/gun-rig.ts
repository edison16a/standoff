import * as THREE from "three";
import { Rng } from "../../engine/rng";
import { WEAPONS, type WeaponId } from "../../engine/weapons";
import { buildGun, type GunModel } from "../models/guns";
import { Debris } from "./debris";
import { forearmLine } from "./hands/grips";
import { Hands } from "./hands/hands";
import { GunParts } from "./parts";
import { KICKS, RecoilSpring } from "./recoil-spring";
import { ReloadPlayer } from "./reload-player";
import { restPose } from "./rest";
import { shotLayer, type ShotState } from "./shot-cycle";

const SEEDS: Record<WeaponId, number> = { shotgun: 11, smg: 23, rifle: 37, ak47: 41 };

/**
 * One player's gun at the bottom of the screen, held in camera space by a
 * pair of gloved hands. It swings to point at the player's aim, rides a
 * recoil spring on each shot, cycles its bolt or pump, and plays each
 * gun's reload in step with the shared timelines the sound uses.
 *
 * The holder sits at the gun's resting place and never turns. Inside it
 * the gun turns to aim, and dropped magazines fall in the holder's frame
 * so they keep falling however the gun moves.
 */
export class GunRig {
  readonly holder = new THREE.Group();
  readonly model: GunModel;
  private readonly gun = new THREE.Group();
  private readonly hands: Hands;
  private readonly parts: GunParts;
  private readonly debris: Debris;
  private readonly spring: RecoilSpring;
  private readonly reload: ReloadPlayer;
  private readonly shot: ShotState = { since: 10, left: 1, sinceFirst: -1 };
  private readonly aim = new THREE.Quaternion();
  private readonly target = new THREE.Quaternion();
  private readonly euler = new THREE.Euler(0, 0, 0, "YXZ");
  private readonly home = new THREE.Vector3();
  private dropped = false;

  constructor(
    readonly weapon: WeaponId,
    colour: THREE.ColorRepresentation = 0x6d7480,
  ) {
    // Seeded, so the showcase's clip of the game plays the same every time.
    const rng = new Rng(SEEDS[weapon]);
    const random = () => rng.next();
    this.model = buildGun(weapon);
    this.hands = new Hands(colour);
    this.parts = new GunParts(weapon, this.model);
    this.debris = new Debris(random);
    this.spring = new RecoilSpring(KICKS[weapon], random);
    this.reload = new ReloadPlayer(weapon);
    this.gun.add(this.model.root, this.hands.group);
    this.holder.add(this.gun, this.debris.group);
  }

  /** Where the gun rests on screen, in camera space. */
  place(x: number, y: number, z: number): void {
    this.home.set(x, y, z);
  }

  /** Turns toward a point given in camera space. */
  pointAt(local: THREE.Vector3): void {
    const dir = local.clone().sub(this.home).normalize();
    const yaw = Math.atan2(-dir.x, -dir.z);
    const pitch = Math.atan2(dir.y, Math.hypot(dir.x, dir.z));
    this.euler.set(pitch, yaw, 0);
    this.target.setFromEuler(this.euler);
  }

  /** A shot left the gun with `left` rounds still in it. The AR's bolt locks back on the last. */
  fire(left = 1): void {
    this.spring.kick();
    this.shot.since = 0;
    this.shot.left = left;
    if (this.shot.sinceFirst < 0) this.shot.sinceFirst = 0;
    // Only a pump gun fires mid reload, and firing ends its loading, so the gun comes back up.
    this.reload.interrupt();
  }

  /** `empty` reloads a dry gun, which also has to chamber a round. */
  startReload(seconds: number, empty = false): void {
    this.reload.start(seconds, empty);
    // The reload shows the held open bolt itself, until the catch is struck.
    this.shot.left = Infinity;
  }

  shell(): void {
    this.reload.shell();
  }

  finishReload(): void {
    this.reload.finish();
  }

  update(dt: number, time: number): void {
    this.aim.slerp(this.target, 1 - Math.exp(-dt * 18));
    this.spring.step(dt);
    this.shot.since += dt;
    if (this.shot.sinceFirst >= 0) this.shot.sinceFirst += dt;
    this.reload.advance(dt);
    this.debris.update(dt);

    const inward = this.home.x > 0 ? 1 : -1;
    const pose = this.reload.pose(shotLayer(this.weapon, restPose(this.weapon), this.shot), inward);
    const kick = this.spring.offset;

    this.holder.position.copy(this.home);
    this.holder.position.y += Math.sin(time * 1.7) * 0.004;
    // Aim, then the reload's lift and roll, then the kick and a slow sway of breathing.
    this.gun.quaternion.copy(this.aim);
    this.gun.quaternion.multiply(QUAT.setFromEuler(EULER.set(...pose.body.rot)));
    this.gun.quaternion.multiply(QUAT.setFromEuler(EULER.set(kick.rise, kick.twist, -kick.roll + Math.sin(time * 1.3) * 0.01)));
    this.gun.position.set(pose.body.pos[0], pose.body.pos[1], pose.body.pos[2] + kick.back).applyQuaternion(this.aim);
    this.gun.updateMatrix();

    this.parts.apply(pose);
    // Forearms hang from the body, not the gun, so turn their lines into the gun's frame.
    const toGun = QUAT.copy(this.gun.quaternion).invert();
    const support = LEFT.set(...forearmLine("support", inward)).normalize().applyQuaternion(toGun);
    const grip = RIGHT.set(...forearmLine("grip", inward)).normalize().applyQuaternion(toGun);
    this.hands.apply(pose.support, pose.grip, support, grip);

    if (pose.dropped && !this.dropped) this.dropMagazine();
    this.dropped = pose.dropped;
  }

  /** Where the muzzle is in the world, and the way it points. */
  muzzle(outAt: THREE.Vector3, outDir: THREE.Vector3): void {
    this.model.muzzle.getWorldPosition(outAt);
    this.model.muzzle.getWorldDirection(outDir).negate();
  }

  laserOrigin(out: THREE.Vector3): THREE.Vector3 {
    return this.model.laser.getWorldPosition(out);
  }

  get big(): boolean {
    return WEAPONS[this.weapon].pellets > 1 || this.weapon === "ak47";
  }

  dispose(): void {
    this.debris.clear();
    this.hands.dispose();
    this.model.root.traverse((o) => o instanceof THREE.Mesh && o.geometry.dispose());
  }

  /** Cuts a copy of the empty magazine loose where it is this frame, falling the way the world's down is. */
  private dropMagazine(): void {
    const magazine = this.parts.magazine?.object;
    if (!magazine) return;
    this.holder.updateMatrixWorld(true);
    const down = DOWN.set(0, -1, 0);
    if (this.holder.parent) down.applyQuaternion(this.holder.parent.getWorldQuaternion(QUAT).invert());
    this.debris.drop(magazine, [down.x, down.y, down.z]);
  }
}

const QUAT = new THREE.Quaternion();
const EULER = new THREE.Euler();
const LEFT = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const DOWN = new THREE.Vector3();
