interface Waiting<T> {
  key: number;
  at: number;
  value: T;
}

/**
 * Things waiting for a round to arrive, keyed by what they belong to (a
 * zombie's id). The engine settles a hit at the trigger pull, but the
 * picture should only react when the round gets there, a few hundredths
 * of a second later. Few wait at once, so a plain list is plenty.
 */
export class ArrivalQueue<T> {
  private readonly waiting: Waiting<T>[] = [];

  get size(): number {
    return this.waiting.length;
  }

  /** Holds `value` for `key` until the clock reaches `at`. */
  push(key: number, at: number, value: T): void {
    this.waiting.push({ key, at, value });
  }

  /** Hands over and forgets everything due by `now`, in the order it arrives. */
  due(now: number, visit: (key: number, value: T) => void): void {
    const ready = this.waiting.filter((w) => w.at <= now).sort((a, b) => a.at - b.at);
    if (ready.length === 0) return;
    for (let i = this.waiting.length - 1; i >= 0; i--) if (this.waiting[i]!.at <= now) this.waiting.splice(i, 1);
    for (const w of ready) visit(w.key, w.value);
  }

  /** Forgets everything for `key`, for a zombie that is gone. */
  drop(key: number): void {
    for (let i = this.waiting.length - 1; i >= 0; i--) if (this.waiting[i]!.key === key) this.waiting.splice(i, 1);
  }
}
