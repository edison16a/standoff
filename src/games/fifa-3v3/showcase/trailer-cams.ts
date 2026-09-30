import * as THREE from "three";
import { CEREMONY_SPOT } from "../engine/ceremony";
import type { MatchState } from "../engine/types";
import { STRIKER } from "./trailer-films";
import { CRANE_FROM, type TrailerCam } from "./trailer-plan";

/** A camera framing, handed to the renderer's fixed shot. */
export interface Pose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
}

type Aim = (s: MatchState, u: number, g: number, out: Pose) => void;

const ease = (v: number) => {
  const t = Math.min(1, Math.max(0, v));
  return t * t * (3 - 2 * t);
};

/**
 * Each cut's camera, from the match, `u`, real seconds into the cut, and
 * `g`, the film's own seconds. Low and close to the play, as a trailer
 * shoots it, never the broadcast view.
 */
const AIMS: Record<TrailerCam, Aim> = {
  // Down on the grass as the slide comes straight at us and he hops over it.
  hurdle: (s, u, g, out) => {
    const a = s.athletes[STRIKER]!.pos;
    out.pos.set(a.x + 1.5, 0.3, a.z - 3.6);
    out.look.set(a.x, 0.85, a.z + 0.3);
    out.fov = 48;
  },
  // Low behind him as he strikes, the goal and the keeper ahead.
  strike: (s, u, g, out) => {
    const a = s.athletes[STRIKER]!.pos;
    out.pos.set(a.x - 2.9, 0.7, a.z - 1.3);
    out.look.set(a.x + 6, 0.9, a.z + 1.6);
    out.fov = 42;
  },
  // Behind the net as the ball bursts into it.
  net: (s, u, g, out) => {
    out.pos.set(26.4 + ease(u / 0.45) * 0.3, 0.95, 0.4);
    out.look.set(18, 1.25, 1.6);
    out.fov = 48;
  },
  // Low in front of him in the corner: the run away, the leap and the half turn, landing facing us.
  sui: (s, u, g, out) => {
    const a = s.athletes[STRIKER]!.pos;
    out.pos.set(a.x + 1.4, 0.45, a.z + 3.5 - ease(u / 1.8) * 0.4);
    out.look.set(a.x, 1.2, a.z);
    out.fov = 42;
  },
  // Low in front of the captain as the cup goes up over his head.
  lift: (s, u, g, out) => {
    const at = CEREMONY_SPOT;
    const k = ease(u / 1.8);
    out.pos.set(at.x + 1.6 - k * 0.4, 0.5 - k * 0.05, at.z + 2.9 - k * 0.4);
    out.look.set(at.x + 0.1, 1.8 + ease(u / 1.3) * 0.35, at.z);
    out.fov = 44;
  },
  // Then pulling back and up across the front of the team. It runs on the film's clock,
  // so the trailer's first second, cut from the same moment, matches its last.
  crane: (s, u, g, out) => {
    const at = CEREMONY_SPOT;
    const k = ease((g - CRANE_FROM) / 2.2);
    const angle = 0.55 - k * 0.9;
    const radius = 4 + k * 2.6;
    out.pos.set(at.x + Math.sin(angle) * radius, 0.8 + k * 1.3, at.z + Math.cos(angle) * radius);
    out.look.set(at.x, 1.6, at.z);
    out.fov = 42;
  },
};

/** Cameras that follow a player are eased toward their aim, so a stride never jolts the picture. */
const FOLLOW: Partial<Record<TrailerCam, number>> = { hurdle: 7, strike: 6, sui: 5 };

const want: Pose = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 40 };

/** Films the trailer: each cut's camera, eased where it follows the play. */
export class TrailerCams {
  readonly pose: Pose = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 40 };
  private first = true;

  /** A new cut: the next frame jumps straight to its framing. */
  cut(): void {
    this.first = true;
  }

  update(cam: TrailerCam, s: MatchState, u: number, g: number, real: number): void {
    AIMS[cam](s, u, g, want);
    const rate = FOLLOW[cam];
    const k = this.first || !rate ? 1 : 1 - Math.exp(-rate * real);
    this.first = false;
    this.pose.pos.lerp(want.pos, k);
    this.pose.look.lerp(want.look, k);
    this.pose.fov = want.fov;
  }
}
