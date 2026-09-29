import type { AimCalibration } from "./aim-math";

const SPANS_KEY = "standoff:aim-spans";

/** The spans this phone measured last time, as if across the whole screen, if there are any worth trusting. */
export function loadSpans(): AimCalibration | null {
  try {
    const raw = JSON.parse(localStorage.getItem(SPANS_KEY) ?? "null") as Partial<AimCalibration> | null;
    const ok = raw && [raw.left, raw.right, raw.up, raw.down].every((v) => typeof v === "number" && v > 0 && v < 1.5);
    return ok ? (raw as AimCalibration) : null;
  } catch {
    return null;
  }
}

export function saveSpans(calibration: AimCalibration): void {
  try {
    localStorage.setItem(SPANS_KEY, JSON.stringify(calibration));
  } catch {
    // Without storage the corners are simply measured again next time.
  }
}
