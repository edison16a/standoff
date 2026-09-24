/**
 * The token that proves this tab owns its seat. It lives in session
 * storage, keyed by room, so a reload keeps your seat and closing the tab
 * forgets it.
 */
const key = (code: string) => `standoff:seat:${code}`;

export function readToken(code: string): string | null {
  try {
    return sessionStorage.getItem(key(code));
  } catch {
    return null;
  }
}

export function writeToken(code: string, token: string): void {
  try {
    sessionStorage.setItem(key(code), token);
  } catch {
    // Without storage a reload joins as a new player.
  }
}
