/** Long enough for most first names, short enough to fit a player chip. */
export const NAME_MAX = 14;
const KEY = "standoff:name";

/** Tidies what a player typed: no control characters, single spaces, capped length. */
export function cleanName(raw: string): string {
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX);
}

/**
 * The name this phone used last time, so a returning player only taps
 * Join. It is kept on the phone only, never on the server.
 */
export function loadName(): string {
  try {
    return cleanName(localStorage.getItem(KEY) ?? "");
  } catch {
    return "";
  }
}

export function saveName(name: string): void {
  try {
    localStorage.setItem(KEY, name);
  } catch {
    // Without storage the phone just asks again next time.
  }
}

export function defaultName(seat: number): string {
  return `Player ${seat}`;
}
