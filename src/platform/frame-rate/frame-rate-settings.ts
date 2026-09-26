/**
 * The player's frame rate cap, set from the settings button and kept on
 * this device only, like the volumes. Null means Max: the screen's own
 * refresh rate. The last measured refresh rate is kept too, so the choices
 * show straight away on the next visit while a new measurement runs.
 */
export interface FrameRateSettings {
  /** Frames per second, or null for Max. */
  cap: number | null;
}

/** Caps offered, highest first. Only those below the screen's rate are shown. */
export const CAPS = [120, 90, 60, 30] as const;

const KEY = "standoff:frame-rate";
const SCREEN_KEY = "standoff:refresh-rate";

type Listener = (settings: FrameRateSettings) => void;
const listeners = new Set<Listener>();
let current: FrameRateSettings | null = null;

const validCap = (value: unknown): number | null =>
  typeof value === "number" && (CAPS as readonly number[]).includes(value) ? value : null;

export function loadFrameRate(): FrameRateSettings {
  if (current) return current;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<FrameRateSettings> | null;
    current = { cap: validCap(raw?.cap) };
  } catch {
    current = { cap: null };
  }
  return current;
}

export function saveFrameRate(next: FrameRateSettings): void {
  current = { cap: validCap(next.cap) };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Without storage the choice still holds until the page closes.
  }
  for (const listener of listeners) listener(current);
}

/** Hears every change. Returns an unsubscribe. */
export function onFrameRate(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The refresh rate measured on an earlier visit, if any. */
export function loadSavedRefresh(): number | null {
  try {
    const value = Number(localStorage.getItem(SCREEN_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function saveRefresh(hz: number): void {
  try {
    localStorage.setItem(SCREEN_KEY, String(hz));
  } catch {
    // Only a head start for next time, so losing it is fine.
  }
}

/** The caps worth offering on a screen of this rate. Unknown shows them all. */
export function capChoices(refreshHz: number | null): number[] {
  return CAPS.filter((cap) => refreshHz === null || cap < refreshHz);
}

/**
 * The cap that actually applies. One at or above the screen's rate would
 * change nothing, so it counts as Max. This happens when a saved cap
 * meets a slower screen.
 */
export function effectiveCap(cap: number | null, refreshHz: number | null): number | null {
  if (cap === null) return null;
  return refreshHz === null || cap < refreshHz ? cap : null;
}
