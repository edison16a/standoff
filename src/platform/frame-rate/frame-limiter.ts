import { effectiveCap, loadFrameRate, loadSavedRefresh, onFrameRate, saveRefresh } from "./frame-rate-settings";
import { RafLimiter } from "./raf-limiter";
import { FALLBACK_RATE, measureRefreshRate, settledRate } from "./refresh-rate";

/** Measurements tried while the page is still busy loading. */
const TRIES = 4;
/** Pause between tries, so a loading page can settle. */
const RETRY_MS = 1500;

/**
 * The host page's one frame limiter. It starts once, measures the screen,
 * and follows the saved cap from then on. It lives as long as the page,
 * since every game and the home screen share the same window.
 */
let limiter: RafLimiter | null = null;
let refresh: number | null = null;
const listeners = new Set<(hz: number | null) => void>();

export function startFrameLimiter(): void {
  if (limiter || typeof window === "undefined") return;
  limiter = new RafLimiter(window);
  refresh = loadSavedRefresh();
  apply();
  onFrameRate(apply);
  void measure(limiter);
}

/** The screen's refresh rate, or null before the first measurement ever finishes. */
export function refreshRate(): number | null {
  return refresh;
}

/** Hears the measured refresh rate. Returns an unsubscribe. */
export function onRefreshRate(listener: (hz: number | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * A page busy loading drops so many frames that it can read far below the
 * screen's real rate, and no screen runs slower than it can refresh. So
 * the best of a few tries wins, stopping as soon as one looks settled.
 * Measured with the browser's own callback, so a cap in place cannot skew it.
 */
async function measure(from: RafLimiter): Promise<void> {
  let best = 0;
  for (let i = 0; i < TRIES; i++) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
    best = Math.max(best, await measureRefreshRate(from.native.request));
    if (settledRate(best)) break;
  }
  // A page that never settled keeps what an earlier visit found, or the usual 60.
  if (settledRate(best)) saveRefresh(best);
  else best = Math.max(best, loadSavedRefresh() ?? FALLBACK_RATE);
  refresh = best;
  apply();
  for (const listener of listeners) listener(best);
}

function apply(): void {
  limiter?.setRate(effectiveCap(loadFrameRate().cap, refresh), refresh ?? undefined);
}
