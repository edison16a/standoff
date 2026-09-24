/**
 * Remembers this tab's room for the length of the tab, so a reload lands
 * back in the same game instead of stranding two phones. Session storage
 * dies with the tab, so nothing outlives the game.
 */
const KEY = "standoff:host-room";

export interface RememberedRoom {
  code: string;
  token: string;
}

export function rememberRoom(room: RememberedRoom): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(room));
  } catch {
    // Without storage a reload just starts a new room.
  }
}

export function recallRoom(): RememberedRoom | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<RememberedRoom>) : null;
    return parsed?.code && parsed.token ? { code: parsed.code, token: parsed.token } : null;
  } catch {
    return null;
  }
}

export function forgetRoom(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to forget.
  }
}
