import * as THREE from "three";
import { CEREMONY_SPOT } from "../engine/ceremony";
import type { Match } from "../engine/match";
import { CRANE_FROM, type TrailerCam } from "./trailer-plan";
import { CAST } from "./trailer-cast";
import { povAim } from "./trailer-pov";

/** A camera framing: where it sits, what it looks at and its lens. The TV camera takes it as its fixed shot. */
export interface Pose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
}

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
 * `g`, the film's own seconds. Low angles close to the play, as a
 * trailer shoots it, never the broadcast view.
 */
const AIMS: Record<TrailerCam, Aim> = {
  // Backing down the lane just ahead of the Playmaker, knee high, as he drives at the rim with the Lockdown defender on his hip.
  drive: (m, u, g, out) => {
    const p = m.athletes[CAST.playmaker]!;
    out.pos.set(p.x + 1.3, 0.5, p.z - 2.5);
    out.look.set(p.x - 0.2, 1.05, p.z + 0.3);
    out.fov = 52;
  },
  // On the floor off the right block, looking up the lane: the Big Man rises at the drive and the lob goes up over him.
  lob: (m, u, g, out) => {
    between(out.pos, [2.5, 0.38, 1.6], [2.3, 0.42, 1.8], ease(u / 1.1));
    out.look.set(-0.6, 1.9, 3.4);
    out.fov = 58;
  },
  // Low under the glass on the right: the Dunker catches it, rises over the Big Man and hammers it down on him.
  poster: (m, u, g, out) => {
    between(out.pos, [1.9, 0.4, 0.45], [1.6, 0.5, 0.6], ease(u / 1.6));
    out.look.set(-0.35, 2.15, 2.4);
    out.fov = 56;
  },
  // Down on the floor off the left block, as the Big Man hits it with the Dunker hanging on the rim above him.
  floor: (m, u, g, out) => {
    between(out.pos, [-2.6, 0.3, 4.0], [-2.3, 0.34, 3.7], ease(u / 1.2));
    out.look.set(0.3, 1.75, 2.0);
    out.fov = 56;
  },
  // Low off the Shooter's right, square to the two of them, as he jabs at the Lockdown defender and steps back.
  jab: (m, u, g, out) => {
    const s = m.athletes[CAST.shooter]!;
    const l = m.athletes[CAST.lockdown]!;
    out.pos.set(s.x + 3.2, 0.55, (s.z + l.z) / 2 + 0.3);
    out.look.set((s.x + l.x) / 2 - 0.1, 1.0, (s.z + l.z) / 2);
    out.fov = 48;
  },
  // Low in front, past the two defenders: he rises, they both fly at him, and the gold leaves his hand.
  leap: (m, u, g, out) => {
    const s = m.athletes[CAST.shooter]!;
    out.pos.set(s.x - 1.5, 0.4, s.z - 4.3);
    out.look.set(s.x - 0.4, 2.0, s.z - 0.8);
    out.fov = 46;
  },
  pov: (m, u, g, out) => povAim(m, u, g, out),
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
const FOLLOW: Partial<Record<TrailerCam, number>> = { drive: 6, jab: 6, leap: 6, pov: 14 };

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
