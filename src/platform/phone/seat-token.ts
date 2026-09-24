/**
 * The token that proves this tab owns its seat. It lives in session
 * storage, keyed by room, so a reload keeps your seat and closing the tab
 * forgets it. The page also keeps its own copy, because every socket
 * handover rejoins with it, and that must work where storage is blocked.
 */
const key = (code: string) => `standoff:seat:${code}`;
const held = new Map<string, string>();

export function readToken(code: string): string | null {
  const own = held.get(code);
  if (own) return own;
  try {
    return sessionStorage.getItem(key(code));
  } catch {
    return null;
  }
}

export function writeToken(code: string, token: string): void {
  held.set(code, token);
  try {
    sessionStorage.setItem(key(code), token);
  } catch {
    // Without storage a reload joins as a new player.
  }
}
