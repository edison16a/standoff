import type { TimedStep } from "../../ballistics";
import type { WeaponId } from "../../engine/weapons";
import { reloadLength, reloadPose, reloadSteps, shellCounted } from "./choreography";
import { span } from "./keyframes";
import { mix, type GunPose } from "./pose";

/** Seconds to blend back to the held gun when firing cuts a reload short. */
const OUTRO = 0.16;
/** A shell count this far off the picture's clock is a real gap, not drift, and is left alone. */
const RESYNC = 0.12;

interface Run {
  t: number;
  seconds: number;
  empty: boolean;
  steps: TimedStep[];
  length: number;
  shells: number;
}

/**
 * Plays one gun's reload on the picture's clock. The engine starts it,
 * counts shells and says when it is done; the player keeps the picture in
 * step with those, and blends out quickly if a shot cuts the reload off.
 * Everything here is plain numbers, so the timing can be tested directly.
 */
export class ReloadPlayer {
  private run: Run | null = null;
  private outro: { from: GunPose; t: number } | null = null;
  private last: GunPose | null = null;

  constructor(private readonly weapon: WeaponId) {}

  get active(): boolean {
    return this.run !== null;
  }

  /** Seconds into the running reload, or null. */
  get time(): number | null {
    return this.run?.t ?? null;
  }

  start(seconds: number, empty: boolean): void {
    const steps = reloadSteps(this.weapon, seconds, empty);
    this.run = { t: 0, seconds, empty, steps, length: reloadLength(this.weapon, seconds, empty), shells: 0 };
    this.outro = null;
  }

  /** The engine counted a shell in. Nudges the clock onto the engine's, so each push lands on its click. */
  shell(): void {
    const run = this.run;
    if (!run) return;
    run.shells += 1;
    const expected = shellCounted(run.shells);
    if (Math.abs(expected - run.t) < RESYNC) run.t = expected;
  }

  /** The engine says the gun is loaded. Anything left is the picture's own tail, like the shotgun's rack. */
  finish(): void {
    const run = this.run;
    if (!run) return;
    run.t = Math.max(run.t, run.seconds);
  }

  /** A shot cuts the reload off: the hands let go of whatever they were doing and the gun comes back up. */
  interrupt(): void {
    if (!this.run) return;
    if (this.last) this.outro = { from: this.last, t: 0 };
    this.run = null;
  }

  advance(dt: number): void {
    if (this.run) {
      this.run.t += dt;
      if (this.run.t >= this.run.length) this.run = null;
    }
    if (this.outro) {
      this.outro.t += dt;
      if (this.outro.t >= OUTRO) this.outro = null;
    }
  }

  /** The pose this frame, over `base`, the held gun with its shot cycle. */
  pose(base: GunPose, inward: number): GunPose {
    const run = this.run;
    if (run) {
      this.last = reloadPose(this.weapon, base, { t: run.t, seconds: run.seconds, empty: run.empty, steps: run.steps, inward });
      return this.last;
    }
    this.last = null;
    if (this.outro) return mix(this.outro.from, base, span(this.outro.t, 0, OUTRO));
    return base;
  }
}
