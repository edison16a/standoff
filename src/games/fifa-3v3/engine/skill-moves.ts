import { BALL } from "./tuning";
import type { SkillKind } from "./types";
import { add, angleDiff, angleOf, len, lerp, norm, scale, type Vec2, type Vec3 } from "./vec";

/**
 * The shape of each skill move over time: where the body runs, which
 * way it faces and where the ball sits against the feet. Everything is
 * a smooth function of the move's progress, so the renderer can follow
 * the same numbers and nothing snaps. The ball is scripted, never
 * loose, so it stays at the feet for the whole move.
 */

export interface MoveSpec {
  /** Seconds the move lasts. */
  length: number;
  /** Progress, 0 to 1, when the defender is tested: the moment the ball goes past them. */
  beat: number;
}

export const MOVES: Record<SkillKind, MoveSpec> = {
  rainbow: { length: 0.88, beat: 0.5 },
  crossover: { length: 0.45, beat: 0.45 },
  elastico: { length: 0.55, beat: 0.55 },
  dragback: { length: 0.6, beat: 0.5 },
  roulette: { length: 0.62, beat: 0.55 },
};

/** What a move is shaped by, fixed when it starts. */
export interface MoveFrame {
  kind: SkillKind;
  /** Facing when it started, and the way the player leaves it, both unit length. */
  from: Vec2;
  exit: Vec2;
  side: 1 | -1;
  /** Pace at the start, and the player's top speed with the ball. */
  pace: number;
  top: number;
}

const R = BALL.radius;
const s = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};
const bump = (v: number) => Math.sin(Math.PI * Math.max(0, Math.min(1, v)));
/** A quarter turn toward `side`, in the pitch plane. */
const lat = (v: Vec2, side: number): Vec2 => ({ x: -v.z * side, z: v.x * side });
const mix = (a: Vec2, b: Vec2, t: number): Vec2 => ({ x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t) });

/** Turns from one facing to another, the long way round on `side` when they are nearly opposite. */
function turn(from: Vec2, to: Vec2, side: number, k: number): number {
  const a = angleOf(from);
  let d = angleDiff(a, angleOf(to));
  if (Math.abs(d) > 2.6) d = side * Math.abs(d);
  return a + d * k;
}

/** The velocity the body wants at progress `u`. */
export function moveVelocity(f: MoveFrame, u: number): Vec2 {
  const { from, exit, top, pace, side } = f;
  switch (f.kind) {
    case "rainbow":
      return scale(exit, top * lerp(0.7, 0.9, s(u / 0.6)));
    case "crossover":
      // Plant on the outside foot, then burst away the other way.
      return add(scale(from, pace * 0.5 * (1 - s(u / 0.4))), scale(exit, top * 0.95 * s((u - 0.2) / 0.5)));
    case "elastico": {
      const fake = scale(lat(from, -side), 1.6 * bump(u / 0.4));
      return add(add(scale(from, pace * 0.45 * (1 - s(u / 0.35))), fake), scale(exit, top * 0.95 * s((u - 0.35) / 0.45)));
    }
    case "dragback":
      return add(scale(from, pace * (1 - s(u / 0.3))), scale(exit, top * 0.85 * s((u - 0.45) / 0.5)));
    case "roulette":
      return add(scale(exit, top * 0.4 * (0.6 + 0.4 * bump(u))), scale(lat(from, side), 1.3 * bump(u)));
  }
}

/** The facing, in radians, at progress `u`. */
export function moveFacing(f: MoveFrame, u: number): number {
  const { from, exit, side } = f;
  switch (f.kind) {
    case "rainbow":
      return turn(from, exit, side, s(u / 0.25));
    case "crossover":
      return turn(from, exit, side, s((u - 0.1) / 0.55));
    case "elastico":
      // A shoulder dip toward the fake, then round to the exit.
      return turn(from, exit, side, s((u - 0.35) / 0.45)) - side * 0.35 * bump(u / 0.4);
    case "dragback":
      return turn(from, exit, side, s((u - 0.35) / 0.45));
    case "roulette":
      return angleOf(from) + side * Math.PI * 2 * s((u - 0.05) / 0.85);
  }
}

/** Where the ball sits against the player's position at progress `u`, and how high. */
export function ballOffset(f: MoveFrame, u: number): Vec3 {
  const { from, exit, side } = f;
  const flat = (v: Vec2, y: number = R): Vec3 => ({ x: v.x, y, z: v.z });
  switch (f.kind) {
    case "rainbow": {
      if (u < 0.22) {
        // Rolled back up the standing leg and trapped between the heels.
        const k = s(u / 0.22);
        return flat(scale(exit, lerp(0.42, -0.18, k)), lerp(R, 0.28, k));
      }
      if (u < 0.8) {
        // Flicked up the back of the calf, over the head, landing out in front.
        const p = (u - 0.22) / 0.58;
        return flat(scale(exit, lerp(-0.18, 1.35, s(p))), lerp(0.28, R, p) + 2.1 * Math.sin(Math.PI * p));
      }
      const q = (u - 0.8) / 0.2;
      return flat(scale(exit, lerp(1.35, 0.9, s(q))), R + 0.14 * bump(q));
    }
    case "crossover": {
      const dir = norm(mix(from, exit, s((u - 0.1) / 0.6)));
      return flat(scale(len(dir) > 0.1 ? dir : exit, 0.42 + 0.12 * bump(u)));
    }
    case "elastico": {
      const fake = norm(add(from, lat(from, -side), 0.9));
      if (u < 0.32) return flat(mix(scale(from, 0.42), scale(fake, 0.55), s(u / 0.32)));
      return flat(mix(scale(fake, 0.55), scale(exit, 0.48), s((u - 0.32) / 0.3)));
    }
    case "dragback": {
      // The sole rolls it back under the body, then the turn brings it round in front.
      const pulled = scale(from, lerp(0.42, -0.26, s((u - 0.08) / 0.37)));
      return flat(mix(pulled, scale(exit, 0.46), s((u - 0.45) / 0.4)));
    }
    case "roulette":
      // The body spins round the ball, which is dragged along between the feet.
      return flat(scale(exit, 0.34 - 0.12 * bump(u)));
  }
}
