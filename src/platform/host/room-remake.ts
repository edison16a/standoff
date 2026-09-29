import type { CandidateResult } from "./room-candidate";
import type { OpenedRoom } from "./room-keeper";
import type { RememberedRoom } from "./room-memory";

/** A click on Regenerate room or Remake lobby, or the host fixing a room by itself. */
export type RemakeReason = "manual" | "auto";

/** Automatic tries per rolling window, and how long to wait before each. */
const WINDOW_MS = 5 * 60_000;
const SPACING_MS = [0, 2000, 6000];
/** A server that refused a create for making too many gets one last try after its minute. */
export const LIMIT_WAIT_MS = 60_000;

/**
 * How many new rooms the host may try on its own. A server that cannot
 * keep a room would otherwise be asked for one after another. A click on
 * Regenerate room always gets a fresh budget.
 */
export class RemakeBudget {
  private tries: number[] = [];

  constructor(private readonly now: () => number = Date.now) {}

  reset(): void {
    this.tries = [];
  }

  get available(): boolean {
    this.prune();
    return this.tries.length < SPACING_MS.length;
  }

  /** Spends a try. Returns how long to wait before it, or null once the budget is spent. */
  take(): number | null {
    if (!this.available) return null;
    const wait = SPACING_MS[this.tries.length]!;
    this.tries.push(this.now());
    return wait;
  }

  private prune(): void {
    const since = this.now() - WINDOW_MS;
    this.tries = this.tries.filter((at) => at > since);
  }
}

/** The part of a RoomCandidate the remake drives. */
export interface Candidate {
  start(game: string, seats: number): Promise<CandidateResult>;
  discard(): void;
}

export interface RemakeDeps<C extends Candidate> {
  make(): C;
  /** The candidate passed: the host moves over to it. */
  swap(candidate: C, room: OpenedRoom, old: RememberedRoom): void;
  /** Every try failed. The old room, if it still exists, stays as it was. */
  giveUp(reason: RemakeReason, old: RememberedRoom): void;
  wait(ms: number): Promise<void>;
  now(): number;
}

/**
 * A full remake: fresh connections and fresh rooms for the same game,
 * tried until one passes its check or the budget runs out. Nothing about
 * the old room changes until then.
 */
export class RoomRemaker<C extends Candidate> {
  readonly budget: RemakeBudget;
  private run = 0;
  private active = false;
  private current: C | null = null;

  constructor(private readonly deps: RemakeDeps<C>) {
    this.budget = new RemakeBudget(deps.now);
  }

  get busy(): boolean {
    return this.active;
  }

  /** Starts a remake. False when one is already running or the budget is spent. */
  start(reason: RemakeReason, old: RememberedRoom): boolean {
    if (this.busy) return false;
    if (reason === "manual") this.budget.reset();
    const wait = this.budget.take();
    if (wait === null) return false;
    this.active = true;
    void this.attempt(++this.run, reason, old, wait, false);
    return true;
  }

  /** Stops a remake under way, for leaving the room. Its room is ended. */
  cancel(): void {
    this.run += 1;
    this.active = false;
    this.current?.discard();
    this.current = null;
  }

  private async attempt(run: number, reason: RemakeReason, old: RememberedRoom, wait: number, limited: boolean): Promise<void> {
    if (wait > 0) await this.deps.wait(wait);
    if (run !== this.run) return;
    const candidate = this.deps.make();
    this.current = candidate;
    const result = await candidate.start(old.game, old.seats);
    if (run !== this.run) return candidate.discard();
    if (result.ok) {
      this.current = null;
      this.active = false;
      return this.deps.swap(candidate, result.room, old);
    }
    candidate.discard();
    // Waiting out the server's minute is worth one more try, once.
    if (result.reason === "limit" && !limited) return this.attempt(run, reason, old, LIMIT_WAIT_MS, true);
    const next = this.budget.take();
    if (next !== null) return this.attempt(run, reason, old, next, limited);
    this.current = null;
    this.active = false;
    this.deps.giveUp(reason, old);
  }
}
