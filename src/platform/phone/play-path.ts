import { cleanName } from "@/platform/profile";

/**
 * Every controller has its own address, /play/<CODE>/<name>. Opening it
 * again, after a reload or a closed tab, puts that player straight back
 * in their seat.
 */
export function playPath(code: string, name: string): string {
  return `/play/${code}/${encodeURIComponent(name)}`;
}

/** The player's name from the address, or null if there is nothing usable. */
export function nameFromPath(raw: string): string | null {
  let decoded = raw;
  // The router may hand the segment over still encoded, and a bare % is not.
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // Keep it as it came.
  }
  return cleanName(decoded) || null;
}

/**
 * Moves the address bar to the player's own address without loading a
 * page, so the seat and the game on screen carry on untouched.
 */
export function showPlayPath(code: string, name: string): void {
  const path = playPath(code, name);
  if (window.location.pathname !== path) window.history.replaceState(null, "", path);
}
