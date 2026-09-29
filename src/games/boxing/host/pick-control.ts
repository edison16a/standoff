import type { MoveEvent, MoveState } from "@/games/kit/camera";
import { BUILD_LIST } from "../engine/builds";

/** How long the guard must be held to lock in a build. */
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
 * Choosing builds with the body: lean left or right to browse, and hold
 * your guard up to lock your build in. The mouse works too. Players are
 * camera slots; slot 1 picks for boxer 0 and slot 2 for boxer 1.
 */
export class PickControl {
  readonly state: PickState;
  private guardSince: [number | null, number | null] = [null, null];
  private lastLean: [number, number] = [-Infinity, -Infinity];
  /**
   * A guard only locks in once it has been seen down since this screen
   * opened. Players arrive from calibration with their gloves still up,
   * and that must not choose for them.
   */
  private dropped: [boolean, boolean] = [false, false];

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
      if (!guard) this.dropped[id] = true;
      if (!guard || !this.dropped[id]) this.guardSince[id] = null;
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
    const count = BUILD_LIST.length;
    this.state.picks[id] = (this.state.picks[id] + direction + count) % count;
    this.avoidSame(id);
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

  /**
   * Two players may pick the same build; the second wears another kit.
   * The computer always takes a different build from its opponent, so a
   * fight against it shows off two styles.
   */
  private avoidSame(keep: 0 | 1 = 0): void {
    const other = keep === 0 ? 1 : 0;
    if (this.state.picks[other] !== this.state.picks[keep]) return;
    const computer = !this.humans[other] ? other : !this.humans[keep] ? keep : null;
    if (computer === null) return;
    this.state.picks[computer] = (this.state.picks[computer] + 1) % BUILD_LIST.length;
  }
}
