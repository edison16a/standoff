import type { Sensitivity } from "@/games/blade-clash/motion/gesture";

/** A new key, since levels saved for the old chop and lift gestures do not fit the new ones. */
const KEY = "standoff:fencing:strike-level";

/**
 * A player's jab level from their last practice, kept on their own
 * phone, so skipping the practice next time still fits how they move.
 * Storage can be blocked, in which case they simply start from the defaults.
 */
export function loadSensitivity(): Sensitivity | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Sensitivity>;
    const ok = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n > 0.2 && n < 3;
    return ok(value.strike) ? { strike: value.strike! } : null;
  } catch {
    return null;
  }
}

export function saveSensitivity(sensitivity: Sensitivity | null): void {
  try {
    if (sensitivity) window.localStorage.setItem(KEY, JSON.stringify(sensitivity));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Blocked storage: the levels still apply for this game.
  }
}
