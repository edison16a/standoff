import type { Lane } from "./tuning";

export type Action = "none" | "jump" | "duck";

/** A move a player has started, that the game will see once the camera has read it. */
interface Pending {
  at: number;
  lane: Lane;
  action: Action;
}

/**
 * A person's limits, for a bot that should play like one: each move
 * reaches the game `lagS` after it is made, as with the camera, and a
 * new move waits `gapS` after the last. A lane change counts as a move,
 * however many lanes it crosses, as a step to the side does.
 */
export class Hands {
  private pending: Pending | null = null;
  private last = -Infinity;
  private held: Lane;

  constructor(
    readonly lagS: number,
    readonly gapS: number,
    lane: Lane = 0,
  ) {
    this.held = lane;
  }

  /** Whether a new move can be made now. */
  free(time: number): boolean {
    return !this.pending && time - this.last >= this.gapS;
  }

  /** Starts a move, if it is one. Returns whether it counted as a move. */
  make(time: number, lane: Lane, action: Action): boolean {
    if (lane === this.held && action === "none") return false;
    this.pending = { at: time + this.lagS, lane, action };
    this.last = time;
    return true;
  }

  /** What the game sees this step: the lane held, and a move that has just arrived. */
  take(time: number): { lane: Lane; action: Action } {
    const p = this.pending;
    if (!p || time < p.at) return { lane: this.held, action: "none" };
    this.pending = null;
    this.held = p.lane;
    return { lane: p.lane, action: p.action };
  }

  get lane(): Lane {
    return this.held;
  }
}
