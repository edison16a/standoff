/** Timeouts that all die with their owner, so nothing fires after the room closes. */
export class Timers {
  private readonly pending = new Set<ReturnType<typeof setTimeout>>();

  later(ms: number, fn: () => void): void {
    const timer = setTimeout(() => {
      this.pending.delete(timer);
      fn();
    }, ms);
    this.pending.add(timer);
  }

  clear(): void {
    for (const timer of this.pending) clearTimeout(timer);
    this.pending.clear();
  }
}
