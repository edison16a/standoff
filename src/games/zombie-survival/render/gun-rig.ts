import * as THREE from "three";
import { WEAPONS, type WeaponId } from "../engine/weapons";
import { buildGun, type GunModel } from "./models/guns";

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/** 0 outside [a, b], rising to 1 across it. */
const span = (t: number, a: number, b: number) => ease((t - a) / (b - a));

/**
 * One player's gun at the bottom of the screen, held in camera space. It
 * swings to point at the player's aim, kicks on each shot, racks its
 * pump or bolt, and plays the reload: magazine out and back in, or shells
 * pushed one by one into the shotgun.
 */
export class GunRig {
  readonly holder = new THREE.Group();
  readonly model: GunModel;
  private readonly aim = new THREE.Quaternion();
  private readonly target = new THREE.Quaternion();
  private readonly euler = new THREE.Euler(0, 0, 0, "YXZ");
  private recoil = 0;
  private sinceShot = 10;
  private reload: { t: number; seconds: number } | null = null;
  private shellT = 1;
  private readonly magHome: THREE.Vector3 | null;
  private readonly home = new THREE.Vector3();

  constructor(readonly weapon: WeaponId) {
    this.model = buildGun(weapon);
    this.holder.add(this.model.root);
    this.magHome = this.model.magazine?.position.clone() ?? null;
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

  fire(): void {
    this.recoil = Math.min(1.4, this.recoil + (this.weapon === "shotgun" ? 1 : this.weapon === "ak47" ? 0.55 : 0.4));
    this.sinceShot = 0;
  }

  startReload(seconds: number): void {
    this.reload = { t: 0, seconds };
  }

  shell(): void {
    this.shellT = 0;
  }

  finishReload(): void {
    this.reload = null;
  }

  update(dt: number, time: number): void {
    this.aim.slerp(this.target, 1 - Math.exp(-dt * 18));
    this.recoil = Math.max(0, this.recoil - dt * (this.weapon === "shotgun" ? 4 : 9));
    this.sinceShot += dt;
    if (this.reload) this.reload.t += dt;
    this.shellT = Math.min(1, this.shellT + dt / 0.35);

    // Reload pose: the gun tips over and down while hands work the magazine.
    const r = this.reload ? Math.min(1, this.reload.t / this.reload.seconds) : 1;
    const tilt = this.reload ? span(r, 0, 0.15) * (1 - span(r, 0.88, 1)) : 0;
    this.holder.quaternion.copy(this.aim);
    this.holder.rotateZ(tilt * 0.7 + Math.sin(time * 1.3) * 0.01);
    this.holder.rotateX(-tilt * 0.35 + this.recoil * 0.1);
    this.holder.position.copy(this.home);
    this.holder.position.y += Math.sin(time * 1.7) * 0.004 - tilt * 0.05;
    this.holder.position.z += this.recoil * 0.05;

    const { magazine, pump, bolt, shell } = this.model;
    if (magazine && this.magHome) {
      const out = this.reload ? span(r, 0.12, 0.35) * (1 - span(r, 0.5, 0.75)) : 0;
      magazine.position.copy(this.magHome);
      magazine.position.y -= out * 0.32;
      magazine.position.z += out * 0.05;
      magazine.rotation.x = out * 0.4;
      magazine.visible = !(this.reload && r > 0.36 && r < 0.49);
    }
    if (bolt) {
      const kick = this.sinceShot < 0.06 ? 1 - this.sinceShot / 0.06 : 0;
      const charge = this.reload ? span(r, 0.8, 0.88) * (1 - span(r, 0.9, 0.97)) : 0;
      bolt.position.z = (kick * 0.6 + charge) * 0.06;
    }
    if (pump) {
      // Rack after every shot, and once at the end of a reload.
      const s = this.sinceShot;
      const rack = s > 0.18 && s < 0.6 ? Math.sin(((s - 0.18) / 0.42) * Math.PI) : 0;
      pump.position.z = rack * 0.08;
    }
    if (shell) {
      shell.visible = this.shellT < 1;
      shell.position.set(0, -0.12 + span(this.shellT, 0, 0.5) * 0.06, 0.02 - span(this.shellT, 0.45, 1) * 0.1);
    }
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
    this.model.root.traverse((o) => o instanceof THREE.Mesh && o.geometry.dispose());
  }
}
