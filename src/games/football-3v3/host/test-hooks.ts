/**
 * Settings browser tests can set before the page loads, to play whole
 * games quickly on a slow machine with software graphics. Development
 * builds only: a real room never reads them.
 */
export interface TestHooks {
  /** A lighter picture: no shadows, no crowd, lower resolution. */
  lowGpu?: boolean;
  /** The full broadcast picture at its top rung, held there, to check the look in software drawing. */
  fullPicture?: boolean;
  /** Shorter quarters, in seconds. */
  quarterSeconds?: number;
  /** A lower score to win. */
  target?: number;
  /** How many fixed steps the match may catch up after a slow frame. */
  catchUp?: number;
}

declare global {
  interface Window {
    __footballTest?: TestHooks;
  }
}

export function testHooks(): TestHooks {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return {};
  return window.__footballTest ?? {};
}
