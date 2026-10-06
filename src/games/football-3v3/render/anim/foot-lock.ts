import { onGround } from "./strides";

/**
 * Keeps planted feet planted. Through a stride each foot locks to the
 * turf where it lands and stays there until it lifts, so it never skates
 * however the body speeds up, slows or curves. Standing, both feet stay
 * put, and when the body turns or drifts too far from one it steps it
 * back under the hips. A juke holds its push off foot while the body
 * drives away from it. In falls, dives and set moves the feet are free.
 */

export interface V3 {
  x: number;
  y: number;
  z: number;
}

/** `plantL` and `plantR` hold that foot down for a juke's push and free the other. */
export type FootMode = "gait" | "free" | "plantL" | "plantR";

export interface FootFrame {
  mode: FootMode;
  phase: number;
  duty: number;
  speed: number;
  /** Where the animation puts each ankle this frame, in the world: left then right. */
  fk: readonly [V3, V3];
  /** The ankle's height with the foot flat on the turf. */
  ankle: number;
  /** Which way the body faces, so a standing turn steps the feet round. */
  yaw: number;
}

interface Foot {
  locked: boolean;
  at: V3;
  /** The body's facing when the foot went down. */
  yaw: number;
  weight: number;
  /** A step back under the body while standing, from where the foot was. */
  step: { from: V3; t: number } | null;
}

/** Below this speed a player is standing, and steps only to keep his feet under him. */
const STAND = 0.35;
/** How far a standing foot may be left from where the body wants it, or the body turn from it, before it steps. */
const DRIFT = 0.16;
const TWIST = 0.5;
const STEP_TIME = 0.24;
const STEP_HEIGHT = 0.07;

const ease = (t: number) => t * t * (3 - 2 * t);

export class FootLock {
  readonly feet: [Foot, Foot] = [this.fresh(), this.fresh()];

  private fresh(): Foot {
    return { locked: false, at: { x: 0, y: 0, z: 0 }, yaw: 0, weight: 0, step: null };
  }

  /** Lifts a foot the leg can no longer reach, so it swings on rather than stretching the leg. */
  release(i: number): void {
    const foot = this.feet[i]!;
    foot.locked = false;
    foot.step = null;
    foot.weight = Math.min(foot.weight, 0.5);
    this.released[i] = true;
  }

  /** A foot let go early stays free until its stride next puts it down. */
  private readonly released = [false, false];

  update(f: FootFrame, dt: number): void {
    for (let i = 0; i < 2; i++) {
      const foot = this.feet[i]!;
      const fk = f.fk[i]!;
      // A cut to another moment moves the body far in a frame: let go rather than stretch.
      if (Math.hypot(foot.at.x - fk.x, foot.at.z - fk.z) > 1.6) Object.assign(foot, this.fresh());
      const other = this.feet[1 - i]!;
      let want = this.wants(f, i, foot, fk, other);
      if (!want) this.released[i] = false;
      else if (this.released[i] && f.mode === "gait" && f.speed >= STAND) want = false;
      if (want && !foot.locked) {
        foot.locked = true;
        foot.at = { x: fk.x, y: f.ankle, z: fk.z };
        foot.yaw = f.yaw;
      } else if (!want && foot.locked) {
        foot.locked = false;
        foot.step = null;
      }
      if (foot.locked && f.mode === "gait" && f.speed < STAND) this.standStep(foot, other, fk, f, dt);
      // Planting takes hold at once; lifting peels off over a few frames, so the toe leaves the turf last.
      const goal = foot.locked ? 1 : 0;
      const rate = foot.locked ? 40 : f.mode === "free" ? 10 : 16;
      foot.weight += (goal - foot.weight) * (1 - Math.exp(-rate * dt));
      if (!foot.locked && foot.weight < 0.01) foot.weight = 0;
    }
  }

  private wants(f: FootFrame, i: number, foot: Foot, fk: V3, other: Foot): boolean {
    switch (f.mode) {
      case "free":
        return false;
      case "plantL":
        return i === 0;
      case "plantR":
        return i === 1;
      case "gait":
        if (f.speed >= STAND) return onGround(f.phase, i === 0, f.duty);
        // Standing: a foot already down stays down; a foot coming down locks as it reaches the turf.
        return foot.locked || (fk.y <= f.ankle + 0.03 && !other.step);
    }
  }

  /** A standing foot left behind by the body steps back under it, one foot at a time. */
  private standStep(foot: Foot, other: Foot, fk: V3, f: FootFrame, dt: number): void {
    const ankle = f.ankle;
    if (!foot.step) {
      const far = Math.hypot(foot.at.x - fk.x, foot.at.z - fk.z) > DRIFT;
      const turned = Math.abs(Math.atan2(Math.sin(f.yaw - foot.yaw), Math.cos(f.yaw - foot.yaw))) > TWIST;
      if (!(far || turned) || other.step) return;
      foot.step = { from: { ...foot.at }, t: 0 };
    }
    const s = foot.step;
    s.t = Math.min(1, s.t + dt / STEP_TIME);
    const k = ease(s.t);
    foot.at = {
      x: s.from.x + (fk.x - s.from.x) * k,
      y: ankle + STEP_HEIGHT * Math.sin(Math.PI * s.t),
      z: s.from.z + (fk.z - s.from.z) * k,
    };
    if (s.t >= 1) {
      foot.at = { x: fk.x, y: ankle, z: fk.z };
      foot.yaw = f.yaw;
      foot.step = null;
    }
  }
}
