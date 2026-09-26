/**
 * Works out the screen's refresh rate from requestAnimationFrame. The
 * browser calls back once per refresh, so counting callbacks over about a
 * second gives the rate. A busy page drops the odd callback, so gaps much
 * longer than the typical one are left out of the count.
 */

/** Rates screens actually run at. A measurement snaps to the nearest one. */
export const COMMON_RATES = [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 180, 200, 240, 280, 360] as const;

/** How far off a common rate a measurement may be and still snap to it. */
const SNAP_TOLERANCE = 0.06;
/** A gap this many times the typical one means frames were dropped. */
const DROP_FACTOR = 1.5;
/** How long a measurement runs. */
export const MEASURE_MS = 1000;
/** What is assumed when nothing can be measured. */
export const FALLBACK_RATE = 60;

/**
 * Real screens refresh at 50 Hz or more. Anything slower means the page
 * was too busy to keep up, so the measurement is worth trying again.
 */
export function settledRate(hz: number): boolean {
  return hz >= 50;
}

/** The middle value, which ignores the odd stall or double callback. */
export function median(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const upper = sorted[mid] ?? NaN;
  return sorted.length % 2 ? upper : ((sorted[mid - 1] ?? NaN) + upper) / 2;
}

/** Nearest common rate, or the rounded rate for an unusual screen. */
export function snapRate(fps: number): number {
  if (!Number.isFinite(fps) || fps <= 0) return FALLBACK_RATE;
  let best: number = COMMON_RATES[0];
  for (const rate of COMMON_RATES) if (Math.abs(rate - fps) < Math.abs(best - fps)) best = rate;
  return Math.abs(best - fps) / best <= SNAP_TOLERANCE ? best : Math.round(fps);
}

/** Frames per second from callback timestamps, before snapping. */
export function countRate(stamps: readonly number[]): number {
  const gaps = stamps.slice(1).map((stamp, i) => stamp - (stamps[i] ?? stamp)).filter((gap) => gap > 0);
  const typical = median(gaps);
  if (!Number.isFinite(typical)) return NaN;
  let frames = 0;
  let time = 0;
  for (const gap of gaps) {
    if (gap > typical * DROP_FACTOR) continue;
    frames++;
    time += gap;
  }
  return time > 0 ? (frames * 1000) / time : NaN;
}

/** The snapped rate from callback timestamps. */
export function estimateRate(stamps: readonly number[]): number {
  return snapRate(countRate(stamps));
}

/**
 * Counts callbacks from the given requestAnimationFrame for about a
 * second. It should be the browser's own one, so a frame cap in place
 * does not skew the answer.
 */
export function measureRefreshRate(
  raf: (callback: FrameRequestCallback) => number,
  durationMs = MEASURE_MS,
): Promise<number> {
  return new Promise((resolve) => {
    const stamps: number[] = [];
    const step = (now: number) => {
      stamps.push(now);
      if (now - (stamps[0] ?? now) < durationMs) raf(step);
      else resolve(estimateRate(stamps));
    };
    raf(step);
  });
}
