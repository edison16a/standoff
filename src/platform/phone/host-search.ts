/**
 * A host that went quiet may have moved to another server instance, where
 * new connections now go. The phone looks there, on a fresh socket that
 * keeps the old one till it confirms (see SocketClient.rotateNow), first
 * soon and then now and then, while the host stays away.
 */
export const LOOK_AFTER_AWAY_MS = [2000, 8000, 8000];

export class HostSearch {
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    /** True while the host is still away. */
    private readonly away: () => boolean,
    private readonly look: () => void,
  ) {}

  start(attempt = 0): void {
    this.stop();
    const wait = LOOK_AFTER_AWAY_MS[attempt];
    if (wait === undefined) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.away()) return;
      this.look();
      this.start(attempt + 1);
    }, wait);
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
