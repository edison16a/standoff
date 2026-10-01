/**
 * Marks each calibration step a phone sends, so the host can tell a late
 * one from a fresh one. Steps can arrive out of order: during a socket
 * handover the old socket and the new one reach the host through
 * different relay instances. A late target landing after "done" would
 * stay drawn on the big screen for good.
 */
export interface StepStamp {
  /** Different for every page load, since a reloaded phone counts from the start again. */
  from: string;
  /** Counts up with every step this page sends. */
  n: number;
}

/** A fresh stamp source for one phone page. */
export function stamper(from = Math.random().toString(36).slice(2, 10)): () => StepStamp {
  let n = 0;
  return () => ({ from, n: ++n });
}

/** Whether a step with stamp `next` is newer than the last one taken. */
export function isNewer(last: StepStamp | undefined, next: StepStamp | undefined): boolean {
  // Unstamped, or from another page load: nothing to compare with, so it counts.
  if (!last || !next || last.from !== next.from) return true;
  return next.n > last.n;
}
