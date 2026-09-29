/**
 * The frame rate readout for the admin panel. The meter counts frames in
 * a sliding one second window, so the number is what the page really
 * draws after the frame limiter, not what the screen could do.
 */
const WINDOW_MS = 1000;

export class FrameMeter {
  private stamps: number[] = [];

  /** Records a frame at now, in milliseconds. */
  frame(now: number): void {
    this.stamps.push(now);
    while (this.stamps.length > 0 && now - this.stamps[0]! > WINDOW_MS) this.stamps.shift();
  }

  /** Frames per second over the window, or 0 before two frames. */
  get fps(): number {
    const count = this.stamps.length;
    if (count < 2) return 0;
    const span = this.stamps[count - 1]! - this.stamps[0]!;
    return span > 0 ? Math.round(((count - 1) * 1000) / span) : 0;
  }
}

/** Whether the meter shows. It lasts until the page reloads, which suits testing. */
let visible = false;
const listeners = new Set<() => void>();

export function meterVisible(): boolean {
  return visible;
}

export function setMeterVisible(next: boolean): void {
  if (next === visible) return;
  visible = next;
  for (const listener of listeners) listener();
}

/** For useSyncExternalStore. */
export function subscribeMeter(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
