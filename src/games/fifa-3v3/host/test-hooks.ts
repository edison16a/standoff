/**
 * Settings browser tests can set before the page loads, to play whole
 * matches quickly on a slow machine with software graphics. Development
 * builds only: a real room never reads them.
 */
export interface TestHooks {
  /** A lighter picture: no shadows, no crowd, lower resolution. */
  lowGpu?: boolean;
  /** A shorter match. */
  seconds?: number;
  goalsToWin?: number;
  /** How far the match may catch up after a slow frame, in fixed steps. */
  catchUp?: number;
}

declare global {
  interface Window {
    __fifaTest?: TestHooks;
  }
}

export function testHooks(): TestHooks {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return {};
  return window.__fifaTest ?? {};
}
