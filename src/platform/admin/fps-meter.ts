/**
 * The admin panel's frame rate readout: whether it shows, as a tiny store
 * for useSyncExternalStore, and the counting behind the number.
 */

type Listener = () => void;

let shown = false;
const listeners = new Set<Listener>();

export function fpsMeterShown(): boolean {
  return shown;
}

export function setFpsMeterShown(next: boolean): void {
  if (next === shown) return;
  shown = next;
  for (const listener of listeners) listener();
}

export function subscribeFpsMeter(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Counts frames and gives the rate once per `windowMs`, so the number is steady enough to read. */
export class FrameCounter {
  private frames = 0;
  private since: number | null = null;

  constructor(private readonly windowMs = 500) {}

  /** Call once a frame. Returns the frames per second when a window closes, else null. */
  frame(now: number): number | null {
    if (this.since === null) {
      this.since = now;
      return null;
    }
    this.frames += 1;
    const elapsed = now - this.since;
    if (elapsed < this.windowMs) return null;
    const fps = (this.frames * 1000) / elapsed;
    this.frames = 0;
    this.since = now;
    return fps;
  }
}
