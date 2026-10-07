import { PASS } from "./tuning";
import type { Athlete } from "./types";
import { angleDiff, dir2, yawOf, type V2 } from "./vec";

/**
 * Passes are authored throwing motions, not one generic arm swing. The
 * game logic picks one as the throw starts, from how far the ball has
 * to go, how fast the QB is moving and how close the rush is, and the
 * engine lets the ball go on that motion's own release frame:
 *
 * a quick three quarter flick for a short ball off set feet, a deep
 * bomb with a long stride and full wind up, a throw on the run with
 * the legs still going, and a fade away under pressure with the arm
 * coming round lower and earlier.
 */
export const THROW_KINDS = ["flick", "bomb", "run", "pressure"] as const;
export type ThrowKind = (typeof THROW_KINDS)[number];

export interface ThrowMove {
  /** Seconds from the start of the motion to the ball leaving the hand. */
  release: number;
  /** The whole motion, the follow through included. */
  dur: number;
  /** Share of his top speed the legs keep through it: set feet brake hard, a throw on the run keeps going. */
  pace: number;
  /** Where the ball leaves the hand: metres up, and out to the throwing side of the body's line. */
  height: number;
  out: number;
}

export const THROW_MOVES: Record<ThrowKind, ThrowMove> = {
  flick: { release: 0.2, dur: 0.5, pace: 0.3, height: 2.0, out: 0.16 },
  bomb: { release: 0.3, dur: 0.68, pace: 0.12, height: 2.12, out: 0.12 },
  run: { release: 0.22, dur: 0.5, pace: 0.85, height: 1.95, out: 0.18 },
  pressure: { release: 0.17, dur: 0.5, pace: 0.45, height: 1.82, out: 0.3 },
};

export const THROW_PICK = {
  /** A ball going this many metres or more is a bomb. */
  deep: 19,
  /** Moving this fast, metres a second, he throws on the run. */
  moving: 2.6,
  /** A rush this close (throw-error.ts `pressure`, 0 to 1) makes him throw off his back foot. */
  pressure: 0.5,
  /** Speed of the hop back off the rusher a fade away starts with. */
  fade: 1.6,
} as const;

/** The throw for a pass this long, from a QB moving this fast with a rush this close. */
export function throwKindFor(dist: number, speed: number, pressure: number): ThrowKind {
  if (pressure >= THROW_PICK.pressure) return "pressure";
  if (speed >= THROW_PICK.moving) return "run";
  return dist >= THROW_PICK.deep ? "bomb" : "flick";
}

/** The move for a throw action, the pitch on a run call keeping its own quick toss. */
export function throwMoveOf(kind: ThrowKind, lob: boolean): ThrowMove {
  return lob ? { ...THROW_MOVES.flick, release: PASS.windup, dur: PASS.throwTime, pace: 0.55 } : THROW_MOVES[kind];
}

/** How much of his speed a passer keeps while this action runs, 1 outside a throw. */
export function throwPace(a: Athlete): number {
  const act = a.action;
  return act.kind === "throw" ? throwMoveOf(act.style, act.lob).pace : 1;
}

/**
 * Where the ball leaves the hand: a step out toward the target and off
 * to the throwing side, at the move's release height. The QB throws
 * right handed and the right of a man facing `d` is (-d.z, d.x).
 */
export function releaseSpot(a: Athlete, to: V2, move: Pick<ThrowMove, "height" | "out">): { x: number; y: number; z: number } {
  const d = dir2(a, to);
  return { x: a.x + d.x * 0.3 - d.z * move.out, y: move.height, z: a.z + d.z * 0.3 + d.x * move.out };
}

/** The most the shoulders may still be off the target as the ball goes; past it the hips come round square. */
export const SQUARE = 0.35;

/**
 * Turns a passer square to his target on the release frame if the turn
 * has not got him there, so no ball ever leaves a hand pointed away.
 */
export function squareUp(a: Athlete, to: V2): void {
  const want = yawOf(to.x - a.x, to.z - a.z);
  const off = angleDiff(a.yaw, want);
  if (Math.abs(off) > SQUARE) a.yaw = want - Math.sign(off) * SQUARE;
}
