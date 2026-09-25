import type { MoveState } from "@/games/kit/camera";
import type { HeadSpot } from "../engine/types";

export interface HeadOptions {
  /** How far the boxer's head moves for each shoulder width the player's head moves, in metres. */
  metres: number;
  /** A light ease against tracking jitter. Kept short, so a quick dodge still counts in time. */
  easeMs: number;
  /** How slowly the middle follows the player sideways, so standing a little off to one side is not a lean forever. */
  followMs: number;
}

/** About one and a half times the player's own move, which reads well on a boxer seen over the shoulder. */
export const DEFAULT_HEAD: HeadOptions = { metres: 0.6, easeMs: 40, followMs: 4000 };

/** The kit's torso length in shoulder widths, to turn its lean into the same unit. */
const TORSO = 1.45;
const MAX_STEP_MS = 250;
const REACH = { side: 0.45, up: 0.2, down: 0.5 };

/**
 * The player's head, for their boxer's head. Up and down is against the
 * calibrated head line, and side to side against where the player has
 * been standing lately, both from the kit in shoulder widths, so a near
 * player and a far one move their boxer alike. The boxer ducks, slips,
 * bobs and weaves exactly as the player does, and punches are judged
 * against it.
 */
export class HeadReader {
  readonly head: HeadSpot = { x: 0, y: 0 };
  private home: number | null = null;
  private last: number | null = null;

  constructor(private readonly options: HeadOptions = DEFAULT_HEAD) {}

  reset(): void {
    this.home = null;
    this.last = null;
    this.head.x = this.head.y = 0;
  }

  update(moves: MoveState | null, now: number): HeadSpot {
    // A long gap between frames counts as a short one, so nothing leaps after a stall.
    const dt = this.last === null ? MAX_STEP_MS : Math.min(MAX_STEP_MS, Math.max(0, now - this.last));
    this.last = now;
    let side = 0;
    let rise = 0;
    if (moves?.present && moves.calibrated) {
      side = moves.head.side;
      rise = moves.head.rise;
    } else if (moves?.present) {
      // No head line yet: the lean still moves the head sideways.
      side = moves.amounts.lean * TORSO;
    }
    if (!moves?.present) this.home = null;
    this.home ??= side;
    const offset = side - this.home;
    // The middle moves after the offset is read, so a dodge is seen on its first frame.
    this.home += offset * (1 - Math.exp(-dt / this.options.followMs));
    const { metres, easeMs } = this.options;
    const x = clamp(offset * metres, -REACH.side, REACH.side);
    const y = clamp(rise * metres, -REACH.down, REACH.up);
    const k = 1 - Math.exp(-dt / easeMs);
    this.head.x += (x - this.head.x) * k;
    this.head.y += (y - this.head.y) * k;
    return this.head;
  }
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}
