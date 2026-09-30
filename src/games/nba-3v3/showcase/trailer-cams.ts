import * as THREE from "three";
import { CEREMONY_SPOT } from "../engine/ceremony";
import type { Match } from "../engine/match";
import { RIM } from "../engine/tuning";
import { CRANE_FROM, type TrailerCam } from "./trailer-plan";

/** A camera framing: where it sits, what it looks at and its lens. The TV camera takes it as its fixed shot. */
export interface Pose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
}

const DUNKER = 1;
const LOCKDOWN = 3;
const PLAYMAKER = 4;
const SHOOTER = 0;

type Aim = (m: Match, u: number, g: number, out: Pose) => void;

const ease = (v: number) => {
  const t = Math.min(1, Math.max(0, v));
  return t * t * (3 - 2 * t);
};

/** Between two points, `t` of the way. */
function between(out: THREE.Vector3, a: readonly number[], b: readonly number[], t: number): THREE.Vector3 {
  return out.set(a[0]! + (b[0]! - a[0]!) * t, a[1]! + (b[1]! - a[1]!) * t, a[2]! + (b[2]! - a[2]!) * t);
}

/**
 * Each cut's camera, from the match, `u`, real seconds into the cut, and
 * `g`, the film's own seconds.
 * Low angles close to the play, as a trailer shoots it, never the
 * broadcast view.
 */
const AIMS: Record<TrailerCam, Aim> = {
  // Knee high beside the two of them on the wing: the crossover, and the defender's ankles going.
  ankles: (m, u, g, out) => {
    const d = m.athletes[DUNKER]!;
    const l = m.athletes[LOCKDOWN]!;
    const cx = (d.x + l.x) / 2;
    const cz = (d.z + l.z) / 2;
    const push = ease(u / 1.3);
    out.pos.set(cx + 3.1 - push * 0.5, 0.5, cz + 1.4 - push * 0.3);
    out.look.set(cx, 0.95, cz);
    out.fov = 40;
  },
  // On the floor by the baseline, on his side of the rim, looking up as he leaves the ground.
  rise: (m, u, g, out) => {
    between(out.pos, [-2.6, 0.45, 0.7], [-2.25, 0.5, 0.95], ease(u / 1.2));
    out.look.set(-0.5, 2.3, 2.2);
    out.fov = 54;
  },
  // Round the other side, level with the rim, as the windmill comes down.
  slam: (m, u, g, out) => {
    between(out.pos, [-2.9, 1.55, 4.3], [-2.6, 1.3, 4.0], ease(u / 1.4));
    out.look.set(-0.25, 2.65, 1.7);
    out.fov = 44;
  },
  // Low and square to the two of them at the top of the key: the iso, face to face.
  iso: (m, u, g, out) => {
    const p = m.athletes[PLAYMAKER]!;
    const s = m.athletes[SHOOTER]!;
    const push = ease(u / 1.4);
    out.pos.set(p.x + 3.2 - push * 0.5, 0.65, p.z - 1.3 + push * 0.2);
    out.look.set((p.x + s.x) / 2, 1.15, (p.z + s.z) / 2 + 0.3);
    out.fov = 38;
  },
  // Over his shoulder as it leaves his hand, turning to follow the ball to the rim.
  release: (m, u, g, out) => {
    const p = m.athletes[PLAYMAKER]!;
    const b = m.ball.pos;
    out.pos.set(p.x + 0.9, 1.85 + ease(u / 0.9) * 0.4, p.z + 2.6);
    out.look.set(b.x * 0.6 + RIM.x * 0.4, Math.min(b.y, 4) * 0.6 + RIM.y * 0.4, b.z * 0.6 + RIM.z * 0.4);
    out.fov = 46;
  },
  // Close on the glass: the ball kisses the board and drops.
  glass: (m, u, g, out) => {
    between(out.pos, [2.1, 2.55, 4.3], [1.8, 2.7, 3.9], ease(u / 1.1));
    out.look.set(RIM.x + 0.1, RIM.y + 0.25, RIM.z - 0.1);
    out.fov = 36;
  },
  // Low in front of the captain as the trophy goes up over his head.
  lift: (m, u, g, out) => {
    const at = CEREMONY_SPOT;
    between(out.pos, [at.x + 1.9, 0.55, at.z + 3.0], [at.x + 1.4, 0.45, at.z + 2.6], ease(u / 1.6));
    out.look.set(at.x + 0.2, 2.0 + ease(u / 1.2) * 0.35, at.z);
    out.fov = 44;
  },
  // Then pulling back and up across the front of the team, the confetti coming down. It runs on the
  // film's clock, so the trailer's first second, cut from the same moment, matches its last.
  crane: (m, u, g, out) => {
    const at = CEREMONY_SPOT;
    const s = ease((g - CRANE_FROM) / 2.2);
    const angle = 0.55 - s * 0.9;
    const radius = 4.2 + s * 2.4;
    out.pos.set(at.x + Math.sin(angle) * radius, 0.8 + s * 1.3, at.z + Math.cos(angle) * radius);
    out.look.set(at.x, 1.9, at.z);
    out.fov = 42;
  },
};

/** Cameras that follow players are eased toward their aim, so a stride never jolts the picture. */
const FOLLOW: Partial<Record<TrailerCam, number>> = { ankles: 5, iso: 6, release: 7 };

const want: Pose = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 40 };

/** Films the trailer: each cut's camera, eased where it follows the play, and a shake for the slam. */
export class TrailerCams {
  readonly pose: Pose = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 40 };
  private first = true;
  private shakeLeft = 0;
  private time = 0;

  /** A new cut: the next frame jumps straight to its framing. */
  cut(): void {
    this.first = true;
  }

  shake(seconds: number): void {
    this.shakeLeft = seconds;
  }

  update(cam: TrailerCam, m: Match, u: number, g: number, real: number): void {
    AIMS[cam](m, u, g, want);
    const rate = FOLLOW[cam];
    const k = this.first || !rate ? 1 : 1 - Math.exp(-rate * real);
    this.first = false;
    this.pose.pos.lerp(want.pos, k);
    this.pose.look.lerp(want.look, k);
    this.pose.fov = want.fov;
    this.time += real;
    this.shakeLeft = Math.max(0, this.shakeLeft - real);
    if (this.shakeLeft > 0) {
      // A hard, quickly dying shudder, the same on every capture since it runs on the film's clock.
      const a = this.shakeLeft * 0.09;
      this.pose.pos.x += Math.sin(this.time * 83) * a;
      this.pose.pos.y += Math.cos(this.time * 67) * a;
    }
  }
}
