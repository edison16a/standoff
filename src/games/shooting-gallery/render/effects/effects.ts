import * as THREE from "three";
import type { TargetKind } from "../../engine/kinds";
import { FLIGHT_S } from "../target-views";
import { Chips } from "./chips";
import { Confetti } from "./confetti";
import { Dents } from "./dents";
import { Popups } from "./popups";
import { Puffs } from "./puffs";
import { Tracers } from "./tracers";

/** What flies off each kind of target when it is struck. */
const FLECKS: Record<TargetKind, readonly string[]> = {
  duck: ["#ffd21f", "#f5b700", "#ff7a12"],
  duckling: ["#ffe45c", "#ffd02a", "#ff7a12"],
  golden: ["#ffc629", "#fff3b0", "#ffffff", "#ffb400"],
  bullseye: ["#d91a2a", "#f7f1e6", "#7a0d18"],
  plate: ["#fff6d0", "#ffd98a", "#e0e4e8"],
};

export interface ShotEffect {
  from: THREE.Vector3;
  /** Which way the barrel points, for the smoke. */
  forward: THREE.Vector3;
  to: THREE.Vector3;
  colour: string;
  kind: TargetKind | null;
  points: number;
  bull: boolean;
}

/**
 * Everything that happens around a shot, timed together: the flash and
 * puff at the muzzle, the BB's flight, and at the far end either flecks
 * and floating points, or dust and a pock mark for a miss.
 */
export class Effects {
  readonly object = new THREE.Group();
  readonly confetti = new Confetti();
  private readonly tracers = new Tracers();
  private readonly puffs = new Puffs();
  private readonly chips = new Chips();
  private readonly popups = new Popups();
  private readonly dents = new Dents();
  private readonly landing: { at: number; shot: ShotEffect }[] = [];

  constructor() {
    this.object.add(this.tracers.object, this.puffs.object, this.chips.object, this.popups.object, this.dents.object, this.confetti.object);
  }

  shot(shot: ShotEffect, now: number): void {
    this.puffs.spawn(shot.from, now, { colour: "#fff1c9", size: 0.1, grow: 1.8, life: 0.07, alpha: 0.95, glow: true, drift: new THREE.Vector3() });
    for (let i = 0; i < 3; i++) {
      const drift = shot.forward.clone().multiplyScalar(0.5 + i * 0.25).add(new THREE.Vector3(0, 0.12, 0));
      this.puffs.spawn(shot.from.clone().addScaledVector(shot.forward, i * 0.03), now, { colour: "#e4e0d8", size: 0.05 + i * 0.02, grow: 5, life: 0.7 + i * 0.15, alpha: 0.5, drift });
    }
    this.tracers.fire(shot.from, shot.to, shot.colour, now);
    this.landing.push({ at: now + FLIGHT_S, shot });
  }

  update(now: number, dt: number): void {
    for (let i = this.landing.length - 1; i >= 0; i--) {
      const { at, shot } = this.landing[i]!;
      if (now < at) continue;
      this.landing.splice(i, 1);
      this.impact(shot, now);
    }
    this.tracers.update(now);
    this.puffs.update(now, dt);
    this.chips.update(now, dt);
    this.popups.update(now);
    this.dents.update(now);
    this.confetti.update(now, dt);
  }

  private impact(shot: ShotEffect, now: number): void {
    if (!shot.kind) {
      this.dents.add(shot.to, now);
      this.puffs.spawn(shot.to, now, { colour: "#cdb999", size: 0.05, grow: 3.5, life: 0.5, alpha: 0.6, drift: new THREE.Vector3(0, 0.2, 0.3) });
      this.chips.burst(shot.to, ["#d8c7a8", "#8a6a4a"], 5, now, 0.8);
      return;
    }
    const special = shot.bull || shot.kind === "golden";
    this.chips.burst(shot.to, FLECKS[shot.kind], special ? 26 : 14, now, special ? 2.2 : 1.6);
    this.puffs.spawn(shot.to, now, { colour: "#ffffff", size: 0.12, grow: 3, life: 0.16, alpha: 0.7, glow: true, drift: new THREE.Vector3() });
    if (shot.points > 0) this.popups.show(shot.to, shot.points, shot.colour, shot.bull ? "BULLSEYE" : shot.kind === "golden" ? "GOLDEN" : null, now);
  }
}
