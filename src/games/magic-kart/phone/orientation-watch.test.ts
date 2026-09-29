import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readPortrait, watchPortrait, type OrientationHost } from "./orientation-watch";

/** A window that can be turned, with the size landing late the way iOS does it. */
function fakeWindow(width: number, height: number) {
  const listeners = new Map<string, Set<() => void>>();
  const on = (type: string, fn: () => void) => listeners.set(type, (listeners.get(type) ?? new Set()).add(fn));
  const off = (type: string, fn: () => void) => listeners.get(type)?.delete(fn);
  const host = {
    innerWidth: width,
    innerHeight: height,
    addEventListener: on,
    removeEventListener: off,
  } satisfies OrientationHost;
  return {
    host,
    fire: (type: string) => listeners.get(type)?.forEach((fn) => fn()),
    count: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
    size(w: number, h: number) {
      host.innerWidth = w;
      host.innerHeight = h;
    },
  };
}

describe("the portrait watch", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("reads the page as it is at the start", () => {
    const seen: boolean[] = [];
    watchPortrait(fakeWindow(852, 393).host, (p) => seen.push(p));
    expect(seen).toEqual([false]);
  });

  it("catches a size that lands after the turn event", () => {
    const win = fakeWindow(852, 393);
    const seen: boolean[] = [];
    watchPortrait(win.host, (p) => seen.push(p));
    // The event fires while the old size is still reported.
    win.fire("orientationchange");
    win.size(393, 852);
    expect(seen).toEqual([false]);
    vi.advanceTimersByTime(300);
    expect(seen).toEqual([false, true]);
  });

  it("comes back to sideways after a brief flip upright with no further resize", () => {
    const win = fakeWindow(852, 393);
    const seen: boolean[] = [];
    watchPortrait(win.host, (p) => seen.push(p));
    win.size(393, 852);
    win.fire("resize");
    // Back sideways, but the only event came before the size did.
    win.fire("resize");
    win.size(852, 393);
    vi.advanceTimersByTime(1000);
    expect(seen).toEqual([false, true, false]);
  });

  it("trusts the orientation media query over a stale size", () => {
    const host = { ...fakeWindow(393, 852).host, matchMedia: () => ({ matches: false }) };
    expect(readPortrait(host)).toBe(false);
  });

  it("removes every listener and pending read when stopped", () => {
    const win = fakeWindow(852, 393);
    const seen: boolean[] = [];
    const stop = watchPortrait(win.host, (p) => seen.push(p));
    win.fire("resize");
    stop();
    win.size(393, 852);
    vi.advanceTimersByTime(1000);
    expect(win.count()).toBe(0);
    expect(seen).toEqual([false]);
  });
});
