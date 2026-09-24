import { WEAPONS, type WeaponId, type WeaponSpec } from "./weapons";

export type TriggerResult = "fired" | "dry" | "wait";

export type GunEvent = { type: "reload-start"; seconds: number } | { type: "shell" } | { type: "reloaded" };

/**
 * Phone timers drift and the network bunches messages, so shots may
 * arrive a little closer together than the rate allows. This much slack
 * keeps a held trigger smooth while still capping a spammed one.
 */
const RATE_SLACK = 0.8;
/** The shotgun lifts the gun before the first shell goes in. */
const SHELL_START = 0.35;

/**
 * One player's gun: the magazine, the reload and the rate of fire. The
 * host runs it, so a phone can only ask to shoot. Times are in game
 * seconds from the engine's clock.
 */
export class Gun {
  readonly spec: WeaponSpec;
  ammo: number;
  /** Seconds left on a magazine reload, or until the next shell. Null when not reloading. */
  private reloadLeft: number | null = null;
  private lastShot = -Infinity;
  private pending: GunEvent[] = [];

  constructor(readonly weapon: WeaponId) {
    this.spec = WEAPONS[weapon];
    this.ammo = this.spec.magazine;
  }

  get reloading(): boolean {
    return this.reloadLeft !== null;
  }

  /** Seconds until the reload now running is done, or 0. */
  get reloadLeftSeconds(): number {
    if (this.reloadLeft === null) return 0;
    if (this.spec.style === "magazine") return this.reloadLeft;
    return this.reloadLeft + Math.max(0, this.spec.magazine - this.ammo - 1) * (this.spec.shell ?? 0.4);
  }

  /** Seconds a full reload from here would take, for the phone's progress ring. */
  get reloadSeconds(): number {
    if (this.spec.style === "magazine") return this.spec.reload;
    return SHELL_START + (this.spec.magazine - this.ammo) * (this.spec.shell ?? 0.4);
  }

  /** A trigger pull at game time `now`. */
  trigger(now: number): TriggerResult {
    if (now - this.lastShot < RATE_SLACK / this.spec.rate) return "wait";
    // A pump gun can stop loading and fire what it has. A magazine is out of the gun.
    if (this.reloading && this.spec.style === "shells" && this.ammo > 0) this.reloadLeft = null;
    if (this.reloading || this.ammo <= 0) {
      this.lastShot = now;
      this.startReload();
      return "dry";
    }
    this.ammo -= 1;
    this.lastShot = now;
    if (this.ammo === 0) this.startReload();
    return "fired";
  }

  /** Starts a reload if one is useful. Returns whether it started. */
  startReload(): boolean {
    if (this.reloading || this.ammo >= this.spec.magazine) return false;
    this.pending.push({ type: "reload-start", seconds: this.reloadSeconds });
    this.reloadLeft = this.spec.style === "magazine" ? this.spec.reload : SHELL_START + (this.spec.shell ?? 0.4);
    return true;
  }

  /** Fills the gun at once, for a new stage or a retry. */
  refill(): void {
    this.ammo = this.spec.magazine;
    this.reloadLeft = null;
  }

  update(dt: number): GunEvent[] {
    if (this.reloadLeft !== null) {
      this.reloadLeft -= dt;
      if (this.reloadLeft <= 0) this.finishStep();
    }
    const out = this.pending;
    this.pending = [];
    return out;
  }

  private finishStep(): void {
    if (this.spec.style === "magazine") {
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
      this.reloadLeft = (this.reloadLeft ?? 0) + (this.spec.shell ?? 0.4);
    }
  }
}
