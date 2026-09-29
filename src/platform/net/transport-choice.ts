/**
 * WebSockets first, everywhere. A WebSocket stays on the server instance
 * that took it, which is what keeps a room together on Vercel without a
 * shared store. The HTTP stream is only for a browser whose WebSocket will
 * not open at all, as Chrome's and Firefox's over HTTP/2 on Vercel have
 * not (see app/api/stream).
 *
 * The page remembers a WebSocket that failed before it opened, so the
 * next connection, a room check or a new room's socket, goes straight to
 * the stream instead of failing again. Only for a while, though: a later
 * fresh connection tries a WebSocket again, so a fix at Vercel, or a blip
 * that was never about WebSockets, does not keep a page on the stream.
 */

/** How long after a failed WebSocket fresh connections stay on the stream. */
export const WEBSOCKET_RETRY_MS = 10 * 60_000;

let failedAt: number | null = null;

/** True when a fresh connection should be an HTTP stream. */
export function preferStream(now = Date.now()): boolean {
  if (streamRequested()) return true;
  return failedAt !== null && now - failedAt < WEBSOCKET_RETRY_MS;
}

/** A WebSocket we still wanted closed before it ever opened. */
export function webSocketFailed(now = Date.now()): void {
  failedAt = now;
}

/** A WebSocket opened, so they work here. */
export function webSocketOpened(): void {
  failedAt = null;
}

/** Lets the fallback be tried anywhere: set "standoff:transport" to "stream" in local storage. */
export function streamRequested(): boolean {
  try {
    return localStorage.getItem("standoff:transport") === "stream";
  } catch {
    return false;
  }
}
