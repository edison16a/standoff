/**
 * Watches whether the page is upright, robust to how phones report a
 * turn. iOS can fire resize before the window's size has caught up, and
 * sometimes never fires it again, so a page read only on resize could
 * stay stuck in portrait with the pedals hidden. This listens to every
 * signal a turn gives and reads again a few times after each one.
 */

/** The parts of the browser this needs, so tests can hand in a fake. */
export interface OrientationHost {
  readonly innerWidth: number;
  readonly innerHeight: number;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
  matchMedia?(query: string): { matches: boolean; addEventListener?(type: "change", listener: () => void): void; removeEventListener?(type: "change", listener: () => void): void };
  screen?: { orientation?: { addEventListener?(type: "change", listener: () => void): void; removeEventListener?(type: "change", listener: () => void): void } };
  visualViewport?: { addEventListener(type: "resize", listener: () => void): void; removeEventListener(type: "resize", listener: () => void): void } | null;
}

/** Reads again after a turn at these delays, since the size can land late. */
export const RECHECK_MS = [50, 250, 700] as const;

const QUERY = "(orientation: portrait)";

/** True when the page is taller than it is wide. The media query is trusted over a stale size. */
export function readPortrait(host: OrientationHost): boolean {
  const media = host.matchMedia?.(QUERY);
  if (media) return media.matches;
  return host.innerHeight > host.innerWidth;
}

/**
 * Calls `onChange` with the upright state now and whenever it changes.
 * Returns a stop function that removes every listener and pending read.
 */
export function watchPortrait(host: OrientationHost, onChange: (portrait: boolean) => void): () => void {
  let last: boolean | null = null;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const read = () => {
    const now = readPortrait(host);
    if (now === last) return;
    last = now;
    onChange(now);
  };
  const turned = () => {
    read();
    for (const ms of RECHECK_MS) {
      const timer = setTimeout(() => {
        timers.delete(timer);
        read();
      }, ms);
      timers.add(timer);
    }
  };

  const media = host.matchMedia?.(QUERY);
  const orientation = host.screen?.orientation;
  host.addEventListener("resize", turned);
  host.addEventListener("orientationchange", turned);
  media?.addEventListener?.("change", turned);
  orientation?.addEventListener?.("change", turned);
  host.visualViewport?.addEventListener("resize", turned);
  read();

  return () => {
    host.removeEventListener("resize", turned);
    host.removeEventListener("orientationchange", turned);
    media?.removeEventListener?.("change", turned);
    orientation?.removeEventListener?.("change", turned);
    host.visualViewport?.removeEventListener("resize", turned);
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
  };
}
