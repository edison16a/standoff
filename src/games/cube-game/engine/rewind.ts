import { copyState, type PlayerEvent, type PlayerState } from "./player";
import { STEP } from "./tuning";

/**
 * How far back a late press may reach. A camera jump is seen a few frames
 * after the body leaves the ground, and the model takes a moment more, so
 * the press is played from when the jump began. Longer than this and the
 * cube would visibly leap to catch up.
 */
export const MAX_REWIND = 0.12;

/** A run as it stood at the start of one step. */
export interface Snapshot {
  time: number;
  player: PlayerState;
  jumps: number;
  checkpoints: number;
  lastCheckpoint: number;
}

/** Identifies an event by what it was and the step it happened on, so a replay can skip what was already heard. */
const keyOf = (time: number, event: PlayerEvent) => `${Math.round(time / STEP)}:${event.type}`;

/**
 * The last moments of a run, step by step, so a press that arrives late
 * can be played at the time it was made. It keeps a copy of the run before
 * each step, the presses used, and the events already sent on.
 */
export class History {
  private snapshots: Snapshot[] = [];
  private used: number[] = [];
  private heard = new Set<string>();
  private heardAt: { time: number; key: string }[] = [];

  constructor(private readonly span = MAX_REWIND) {}

  clear(): void {
    this.snapshots = [];
    this.used = [];
    this.heard.clear();
    this.heardAt = [];
  }

  save(snapshot: Omit<Snapshot, "player"> & { player: PlayerState }): void {
    this.snapshots.push({ ...snapshot, player: copyState(snapshot.player) });
    this.forget(snapshot.time);
  }

  /** A press used on the step at `time`. */
  usedAt(time: number): void {
    this.used.push(time);
  }

  /** An event sent on at `time`. */
  heardEvent(time: number, event: PlayerEvent): void {
    const key = keyOf(time, event);
    this.heard.add(key);
    this.heardAt.push({ time, key });
  }

  /** True if this event, on this step, was already sent on before a rewind. */
  wasHeard(time: number, event: PlayerEvent): boolean {
    return this.heard.has(keyOf(time, event));
  }

  /**
   * The snapshot to replay from for a press at `at`: the first step at or
   * after it. Null if `at` is further back than the history reaches.
   * Everything after it is dropped, and the presses used since are handed
   * back so the replay uses them again.
   */
  rewindTo(at: number): { snapshot: Snapshot; presses: number[] } | null {
    const index = this.snapshots.findIndex((s) => s.time >= at - 1e-9);
    const first = this.snapshots[0];
    if (index < 0 || !first || at < first.time - 1e-9) return null;
    const snapshot = this.snapshots[index]!;
    this.snapshots.length = index;
    const presses = this.used.filter((t) => t >= snapshot.time - 1e-9);
    this.used = this.used.filter((t) => t < snapshot.time - 1e-9);
    return { snapshot: { ...snapshot, player: copyState(snapshot.player) }, presses };
  }

  private forget(now: number): void {
    const oldest = now - this.span;
    let drop = 0;
    while (drop < this.snapshots.length && this.snapshots[drop]!.time < oldest - 1e-9) drop++;
    if (drop) this.snapshots.splice(0, drop);
    this.used = this.used.filter((t) => t >= oldest - 1e-9);
    while (this.heardAt.length && this.heardAt[0]!.time < oldest - STEP) this.heard.delete(this.heardAt.shift()!.key);
  }
}
