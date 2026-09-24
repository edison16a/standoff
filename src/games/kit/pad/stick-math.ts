/** A stick reading: x right and y up, with length at most 1. */
export interface Stick {
  x: number;
  y: number;
}

export const CENTER: Stick = { x: 0, y: 0 };

/** Below this much of the throw the stick reads as centred, so a resting thumb never creeps. */
export const DEAD_ZONE = 0.14;

/**
 * Turns a thumb's offset from where it first touched, in pixels, into a
 * stick reading. Screen y grows downward, so it is flipped. Past the dead
 * zone the throw is rescaled to start from zero, which keeps slow walks
 * possible, and it is capped at full throw.
 */
export function stickFromOffset(dx: number, dy: number, radius: number): Stick {
  const length = Math.hypot(dx, dy);
  if (length === 0 || radius <= 0) return CENTER;
  const throwAmount = Math.min(1, length / radius);
  if (throwAmount < DEAD_ZONE) return CENTER;
  const scaled = (throwAmount - DEAD_ZONE) / (1 - DEAD_ZONE);
  return { x: (dx / length) * scaled, y: (-dy / length) * scaled };
}

/** Whether two readings differ enough to be worth sending. */
export function stickMoved(a: Stick, b: Stick, epsilon = 0.02): boolean {
  return Math.abs(a.x - b.x) > epsilon || Math.abs(a.y - b.y) > epsilon;
}
