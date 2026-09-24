/**
 * Keeps the screen on while playing. Without it a phone held still in
 * guard dims and locks mid match. The lock drops whenever the tab is
 * hidden, so it is taken again when the tab comes back.
 */
export class ScreenAwake {
  private sentinel: WakeLockSentinel | null = null;
  private readonly onVisible = () => {
    if (document.visibilityState === "visible") void this.acquire();
  };

  async start(): Promise<void> {
    document.addEventListener("visibilitychange", this.onVisible);
    await this.acquire();
  }

  stop(): void {
    document.removeEventListener("visibilitychange", this.onVisible);
    void this.sentinel?.release();
    this.sentinel = null;
  }

  private async acquire(): Promise<void> {
    if (!("wakeLock" in navigator) || this.sentinel) return;
    try {
      this.sentinel = await navigator.wakeLock.request("screen");
      this.sentinel.addEventListener("release", () => (this.sentinel = null));
    } catch {
      // Low battery mode and some browsers refuse. The game still works.
    }
  }
}
