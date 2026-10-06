import type { AimPoint } from "./motion/sword-aim";
import type { Slot } from "./players";
import { VIEWS } from "./render/split";

/**
 * Sword moves for keyboard play, as paths of the aim point the drag pad
 * would trace: where the blade points on the player's own view, past the
 * edges to raise it high or swing it wide. The host judges them like any
 * phone's sword, so a cut lands only by passing through fast.
 */

/** How far past the view's edges the mouse can carry the blade, as on the drag pad. */
export const REACH_PAST = 1.3;
const WINDUP_MS = 110;
const CUT_MS = 170;
const THRUST_IN_MS = 90;
const THRUST_HOLD_MS = 170;
/** A cut ends a moment past its target, so the blade does not snap straight back. */
const FOLLOW_MS = 90;

/** One scripted move: through each point in turn, each reached in its own time. */
export interface SwordMove {
  start: number;
  points: { at: AimPoint; ms: number }[];
}

export type CutName = "left" | "right" | "overhead";

/** The named cuts, from where the blade starts to where it ends, through the opponent in the middle. */
const CUTS: Record<CutName, [AimPoint, AimPoint]> = {
  left: [
    { x: -1.15, y: 1.05 },
    { x: 0.9, y: -0.9 },
  ],
  right: [
    { x: 1.15, y: 1.05 },
    { x: -0.9, y: -0.9 },
  ],
  overhead: [
    { x: 0.1, y: 1.35 },
    { x: 0, y: -0.95 },
  ],
};

/** The mouse over the big screen, in the aim kit's space, as an aim point on this player's own half. */
export function viewPoint(stage: AimPoint, slot: Slot): AimPoint {
  const rect = VIEWS[slot];
  const fx = (stage.x + 1) / 2;
  const fy = (1 - stage.y) / 2;
  const x = ((fx - rect.x) / rect.w) * 2 - 1;
  const y = 1 - ((fy - rect.y) / rect.h) * 2;
  const clamp = (v: number) => Math.max(-REACH_PAST - 0.3, Math.min(REACH_PAST + 0.3, v * REACH_PAST));
  return { x: clamp(x), y: clamp(y) };
}

/** A named cut, wound up from where the blade is now. */
export function cut(name: CutName, from: AimPoint, now: number): SwordMove {
  const [start, end] = CUTS[name];
  return { start: now, points: [{ at: from, ms: 0 }, { at: start, ms: WINDUP_MS }, { at: end, ms: CUT_MS }, { at: end, ms: FOLLOW_MS }] };
}

/**
 * A slash from wherever the mouse holds the blade, straight through the
 * middle to the far side. From near the middle it cuts down from high
 * on the right, as a held blade has no side to swing from.
 */
export function slashFrom(from: AimPoint, now: number): SwordMove {
  const wide = Math.hypot(from.x, from.y) >= 0.45;
  const start = wide ? from : CUTS.right[0];
  const end = { x: -start.x * 0.85, y: -start.y * 0.85 };
  return { start: now, points: [{ at: from, ms: 0 }, { at: start, ms: wide ? 0 : WINDUP_MS }, { at: end, ms: CUT_MS }, { at: end, ms: FOLLOW_MS }] };
}

/** Straight at the opponent in the middle of the view, which stretches the arm out, and held there a moment. */
export function thrust(from: AimPoint, now: number): SwordMove {
  const middle = { x: 0, y: 0 };
  return { start: now, points: [{ at: from, ms: 0 }, { at: middle, ms: THRUST_IN_MS }, { at: middle, ms: THRUST_HOLD_MS }] };
}

/** Upright in front of the face, leaning toward the mouse's side, to catch a cut. */
export function parryPoint(mouse: AimPoint): AimPoint {
  return { x: Math.max(-0.45, Math.min(0.45, mouse.x * 0.4)), y: 1.15 };
}

/** Where a move holds the blade at `now`, or null once it is over. Each leg eases in and out. */
export function moveAt(move: SwordMove, now: number): AimPoint | null {
  let t = now - move.start;
  for (let i = 1; i < move.points.length; i++) {
    const a = move.points[i - 1]!;
    const b = move.points[i]!;
    if (t <= b.ms) {
      const k = b.ms <= 0 ? 1 : t / b.ms;
      const e = k * k * (3 - 2 * k);
      return { x: a.at.x + (b.at.x - a.at.x) * e, y: a.at.y + (b.at.y - a.at.y) * e };
    }
    t -= b.ms;
  }
  return null;
}
