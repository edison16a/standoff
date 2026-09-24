import type { FeedbackEvent } from "@/games/fencing/protocol";

/**
 * Buzz patterns per event, in milliseconds. `navigator.vibrate` works on
 * Android. iOS Safari has never supported it, and the checkbox switch
 * trick that briefly worked was closed in iOS 26.5, so on iPhones this is
 * silently a no op and the sound on the computer carries the feedback.
 */
const PATTERNS: Record<FeedbackEvent, number[]> = {
  scored: [30, 40, 30],
  touched: [120],
  parried: [20],
  blocked: [60, 30, 20],
};

export function buzz(event: FeedbackEvent): void {
  if (typeof navigator.vibrate === "function") navigator.vibrate(PATTERNS[event]);
}

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
