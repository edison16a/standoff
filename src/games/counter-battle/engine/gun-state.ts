import { GUNS, type GunId, type GunSpec } from "./guns";
import type { Rng } from "./rng";

export type TriggerResult = "fired" | "dry" | "wait";

export type GunEvent = { type: "reload-start"; seconds: number } | { type: "shell" } | { type: "reloaded" };

/** After a dry click the trigger stays quiet this long. */
const DRY_PAUSE = 0.35;
/** The shotgun lifts before the first shell goes in. */
const SHELL_START = 0.4;
/** Shots in a row before the sideways kick swings the other way. */
const SWAY_RUN = 5;

/**
 * One fighter's gun: magazine, reload, rate of fire and the kick. The
 * host runs it, so a phone can only ask to shoot. `kick` is how far the
 * recoil has pushed the barrel off the player's aim right now (radians,
 * pitch up and yaw right); it is added to every shot and shown in the
 * crosshair and camera, then eases back.
 */
export class Gun {
  readonly spec: GunSpec;
  ammo: number;
  readonly kick = { pitch: 0, yaw: 0 };
  /** Extra cone from shots in quick succession, which settles with the kick. */
  bloom = 0;
  private reloadLeft: number | null = null;
  private lastShot = -Infinity;
  private clicked = false;
  private streak = 0;
  private sway = 1;
  private pending: GunEvent[] = [];

  constructor(readonly id: GunId) {
    this.spec = GUNS[id];
    this.ammo = this.spec.magazine;
  }

  get reloading(): boolean {
    return this.reloadLeft !== null;
  }

  /** Seconds until the reload running now is done, or 0. */
  get reloadLeftSeconds(): number {
    if (this.reloadLeft === null) return 0;
    if (this.spec.shell === null) return this.reloadLeft;
    return this.reloadLeft + Math.max(0, this.spec.magazine - this.ammo - 1) * this.spec.shell;
  }

  /** Seconds a full reload from here takes, for the phone's progress ring. */
  get reloadSeconds(): number {
    if (this.spec.shell === null) return this.spec.reload;
    return SHELL_START + (this.spec.magazine - this.ammo) * this.spec.shell;
  }

  /** Whether a pull at `now` would fire rather than wait on the rate of fire. */
  ready(now: number): boolean {
    return now - this.lastShot >= 1 / this.spec.rate && (this.ammo > 0 || this.reloading);
  }

  /** A trigger pull at game time `now`. The kick of a fired shot lands straight away. */
  trigger(now: number, rng: Rng): TriggerResult {
    if (now - this.lastShot < 1 / this.spec.rate) return "wait";
    // A pump gun can stop loading and fire what it has. A magazine is out of the gun.
    if (this.reloading && this.spec.shell !== null && this.ammo > 0) this.reloadLeft = null;
    if (this.reloading || this.ammo <= 0) {
      this.startReload();
      if (this.clicked) return "wait";
      this.clicked = true;
      this.lastShot = now + DRY_PAUSE;
      return "dry";
    }
    this.ammo -= 1;
    // A pause long enough for the kick to settle starts a fresh pattern.
    this.streak = now - this.lastShot > 0.5 ? 1 : this.streak + 1;
    this.lastShot = now;
    this.recoil(rng);
    if (this.ammo === 0) this.startReload();
    return "fired";
  }

  /**
   * Each shot climbs and drifts sideways in a run that swings one way,
   * then the other, like a real spray. The climb is capped so a held
   * trigger stays hard but not hopeless.
   */
  private recoil(rng: Rng): void {
    const r = this.spec.recoil;
    if (this.streak % SWAY_RUN === 1) this.sway = rng.next() < 0.5 ? -1 : 1;
    this.kick.pitch = Math.min(r.max, this.kick.pitch + r.pitch * rng.range(0.85, 1.15));
    this.kick.yaw += r.yaw * (this.sway * 0.7 + rng.range(-0.6, 0.6));
    this.kick.yaw = Math.max(-r.max * 0.5, Math.min(r.max * 0.5, this.kick.yaw));
    this.bloom = Math.min(this.spec.bloom * 8, this.bloom + this.spec.bloom);
  }

  /** Starts a reload if one is useful. Returns whether it started. */
  startReload(): boolean {
    if (this.reloading || this.ammo >= this.spec.magazine) return false;
    this.pending.push({ type: "reload-start", seconds: this.reloadSeconds });
    this.clicked = false;
    this.reloadLeft = this.spec.shell === null ? this.spec.reload : SHELL_START + this.spec.shell;
    return true;
  }

  /** A full gun and a still barrel, for a new round. */
  refill(): void {
    this.ammo = this.spec.magazine;
    this.reloadLeft = null;
    this.clicked = false;
    this.kick.pitch = 0;
    this.kick.yaw = 0;
    this.bloom = 0;
    this.streak = 0;
    this.lastShot = -Infinity;
    this.pending = [];
  }

  update(dt: number): GunEvent[] {
    const settle = Math.exp(-this.spec.recoil.recover * dt);
    this.kick.pitch *= settle;
    this.kick.yaw *= settle;
    this.bloom *= settle;
    if (this.reloadLeft !== null) {
      this.reloadLeft -= dt;
      if (this.reloadLeft <= 0) this.finishStep();
    }
    const out = this.pending;
    this.pending = [];
    return out;
  }

  private finishStep(): void {
    if (this.spec.shell === null) {
      this.ammo = this.spec.magazine;
      this.reloadLeft = null;
      this.pending.push({ type: "reloaded" });
      return;
    }
    this.ammo += 1;
    this.pending.push({ type: "shell" });
    if (this.ammo >= this.spec.magazine) {
      this.reloadLeft = null;
      this.pending.push({ type: "reloaded" });
    } else {
      this.reloadLeft = (this.reloadLeft ?? 0) + this.spec.shell;
    }
  }
}
