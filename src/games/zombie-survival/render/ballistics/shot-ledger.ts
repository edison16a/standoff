interface Entry<T> {
  seat: number;
  zombie: number;
  made: number;
  value: T;
}

/** An entry this old was never claimed by a hit event and never will be. */
const STALE = 1;

/**
 * Matches the engine's hit events to the rounds the picture fired. The
 * renderer casts every bullet and knows where each lands and when it
 * arrives; the engine then reports each hit with its damage and whether
 * it killed. One entry is written per bullet that struck a zombie and
 * claimed by the hit event for the same seat and zombie, oldest first,
 * so each of a shotgun's pellets claims its own.
 */
export class ShotLedger<T> {
  private readonly entries: Entry<T>[] = [];

  record(seat: number, zombie: number, now: number, value: T): void {
    this.prune(now);
    this.entries.push({ seat, zombie, made: now, value });
  }

  /** The oldest unclaimed entry for this seat and zombie, removed, or undefined if there is none. */
  take(seat: number, zombie: number): T | undefined {
    const i = this.entries.findIndex((e) => e.seat === seat && e.zombie === zombie);
    if (i < 0) return undefined;
    return this.entries.splice(i, 1)[0]!.value;
  }

  get size(): number {
    return this.entries.length;
  }

  /** Drops entries no event claimed, like a pellet that struck a zombie already dead. */
  prune(now: number): void {
    for (let i = this.entries.length - 1; i >= 0; i--) if (now - this.entries[i]!.made > STALE) this.entries.splice(i, 1);
  }
}
