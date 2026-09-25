import type { MoveEvent, MoveState } from "@/games/kit/camera";
import { LOOKS } from "../render/models/looks";

/** How long the guard must be held to lock in a boxer. */
export const LOCK_MS = 900;
/** Leans closer together than this browse only once. */
const LEAN_REPEAT_MS = 450;

export interface PickState {
  picks: [number, number];
  locked: [boolean, boolean];
  /** How far each player's guard hold has filled, 0 to 1. */
  holding: [number, number];
}

/**
 * Choosing boxers with the body: lean left or right to browse, and hold
 * your guard up to lock your boxer in. The mouse works too. Players are
 * camera slots; slot 1 picks boxer 0 and slot 2 boxer 1.
 */
export class PickControl {
  readonly state: PickState;
  private guardSince: [number | null, number | null] = [null, null];
  private lastLean: [number, number] = [-Infinity, -Infinity];

  constructor(
    picks: [number, number],
    private readonly humans: readonly [boolean, boolean],
  ) {
    this.state = { picks: [...picks], locked: [!humans[0], !humans[1]], holding: [0, 0] };
    this.avoidSame();
  }

  get done(): boolean {
    return this.state.locked[0] && this.state.locked[1];
  }

  /** A lean browses. Returns true when the choice changed. */
  onMove(event: MoveEvent): boolean {
    const id = event.slot - 1;
    if (event.type !== "lean" || event.side === 0 || (id !== 0 && id !== 1) || this.state.locked[id]) return false;
    if (event.time - this.lastLean[id] < LEAN_REPEAT_MS) return false;
    this.lastLean[id] = event.time;
    this.step(id, event.side);
    return true;
  }

  /** Every frame: a guard held long enough locks the boxer in. Returns the boxers locked this frame. */
  update(moves: readonly (MoveState | null)[], now: number): number[] {
    const locked: number[] = [];
    for (const id of [0, 1] as const) {
      if (this.state.locked[id]) {
        this.state.holding[id] = 0;
        continue;
      }
      const guard = !!moves[id]?.guard;
      if (!guard) this.guardSince[id] = null;
      else this.guardSince[id] ??= now;
      const since = this.guardSince[id];
      this.state.holding[id] = since === null ? 0 : Math.min(1, (now - since) / LOCK_MS);
      if (this.state.holding[id] >= 1) {
        this.lock(id);
        locked.push(id);
      }
    }
    return locked;
  }

  step(id: 0 | 1, direction: number): void {
    if (this.state.locked[id]) return;
    const count = LOOKS.length;
    let next = (this.state.picks[id] + direction + count) % count;
    // Two people cannot be the same boxer, so a taken one is skipped.
    if (next === this.state.picks[id === 0 ? 1 : 0] && this.humans[id === 0 ? 1 : 0]) next = (next + direction + count) % count;
    this.state.picks[id] = next;
    this.avoidSame();
  }

  choose(id: 0 | 1, index: number): void {
    if (this.state.locked[id]) return;
    this.state.picks[id] = index;
    this.avoidSame(id);
  }

  lock(id: 0 | 1): void {
    this.state.locked[id] = true;
    this.state.holding[id] = 0;
    this.avoidSame(id);
  }

  /** The computer, or a player who has not locked in, never shares a boxer with the other. */
  private avoidSame(keep: 0 | 1 = 0): void {
    const other = keep === 0 ? 1 : 0;
    if (this.state.picks[other] !== this.state.picks[keep]) return;
    if (this.state.locked[other] && this.humans[other]) {
      this.state.picks[keep] = (this.state.picks[keep] + 1) % LOOKS.length;
      return;
    }
    this.state.picks[other] = (this.state.picks[other] + 1) % LOOKS.length;
  }
}
