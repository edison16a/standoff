const MIN_BACKOFF_MS = 400;
const MAX_BACKOFF_MS = 4000;
/** After this many failed tries in a row the UI says the server cannot be reached. */
const UNREACHABLE_AFTER = 4;

/**
 * How long to wait before the next reconnect. It doubles with each failure
 * up to a few seconds, so a phone that walked out of range keeps trying
 * without hammering the server once it is back.
 */
export class Backoff {
  private delay = MIN_BACKOFF_MS;
  private failures = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** A socket opened: the next failure starts from the shortest wait again. */
  reset(): void {
    this.delay = MIN_BACKOFF_MS;
    this.failures = 0;
  }

  /** A fresh dial by hand starts from the shortest wait but still counts the failures. */
  shorten(): void {
    this.delay = MIN_BACKOFF_MS;
  }

  /** Counts a failure and runs `dial` once the wait is over. */
  schedule(dial: () => void): void {
    this.failures += 1;
    this.cancel();
    this.timer = setTimeout(() => {
      this.timer = null;
      dial();
    }, this.delay);
    this.delay = Math.min(MAX_BACKOFF_MS, this.delay * 2);
  }

  /** Drops a reconnect still waiting out its wait, so it cannot dial a second socket. */
  cancel(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  get unreachable(): boolean {
    return this.failures >= UNREACHABLE_AFTER;
  }
}
