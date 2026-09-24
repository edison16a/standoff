/**
 * A token bucket per socket. Phones stream motion at about 60 frames a
 * second, so the budget sits comfortably above that while still stopping
 * a runaway client from flooding the host.
 */
export class RateLimiter {
  private tokens: number;
  private last: number;

  constructor(
    private readonly perSecond = 150,
    private readonly burst = 300,
    private readonly now: () => number = () => performance.now(),
  ) {
    this.tokens = burst;
    this.last = now();
  }

  /** Spends one token. Returns false when the socket is over budget. */
  take(): boolean {
    const now = this.now();
    this.tokens = Math.min(this.burst, this.tokens + ((now - this.last) / 1000) * this.perSecond);
    this.last = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}
