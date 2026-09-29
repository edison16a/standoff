/**
 * WebSockets first, everywhere. A WebSocket stays on the server instance
 * that took it, which is what keeps a room together on Vercel without a
 * shared store. The HTTP stream is only for a browser whose WebSocket will
 * not open at all, which Chrome's and Firefox's over HTTP/2 on Vercel may
 * not (see app/api/stream).
 *
 * A WebSocket that fails once proves little: a server restarting, a deploy
 * or a phone waking with no network all look the same. So the page only
 * decides WebSockets are blocked when none has ever opened here and the
 * stream then opens in its place, which means the server was up all along.
 * Even that lasts a while only, so a fix at Vercel reaches the page.
 */

/** How long after WebSockets proved blocked fresh connections go straight to the stream. */
export const WEBSOCKET_RETRY_MS = 10 * 60_000;
/**
 * On a page where WebSockets have worked, this many failures in a row
 * before the stream stands in for one connection, in case something on
 * the way started blocking them. Until then a failure is an outage.
 */
export const FALLBACK_AFTER = 3;

let worked = false;
let blockedAt: number | null = null;

/** True when a fresh connection should be an HTTP stream. */
export function preferStream(now = Date.now()): boolean {
  if (streamRequested()) return true;
  return blockedAt !== null && now - blockedAt < WEBSOCKET_RETRY_MS;
}

/** A WebSocket opened, so they work here. */
export function webSocketOpened(): void {
  worked = true;
  blockedAt = null;
}

/** A WebSocket we still wanted closed before it opened. True if the stream should stand in for it at once. */
export function standInAfter(failuresInRow: number): boolean {
  return !worked || failuresInRow >= FALLBACK_AFTER;
}

/** A stream opened where a WebSocket had just failed. On a page where none ever opened, they are blocked. */
export function streamStoodIn(now = Date.now()): void {
  if (!worked) blockedAt = now;
}

/** Back to a page that has not tried anything yet, for tests. */
export function resetTransportChoice(): void {
  worked = false;
  blockedAt = null;
}

/** Lets the fallback be tried anywhere: set "standoff:transport" to "stream" in local storage. */
export function streamRequested(): boolean {
  try {
    return localStorage.getItem("standoff:transport") === "stream";
  } catch {
    return false;
  }
}

/** One client's WebSockets that failed in a row, and what that means for its next connection. */
export class TransportTally {
  private refusals = 0;

  opened(stream: boolean, standingIn: boolean): void {
    if (!stream) {
      this.refusals = 0;
      webSocketOpened();
    } else if (standingIn) streamStoodIn();
  }

  /**
   * A channel closed. Only a WebSocket the client still wanted counts: one
   * it closed itself while connecting, on a redial, says nothing. True if
   * the stream should stand in for it at once.
   */
  closed(stream: boolean, opened: boolean, wanted: boolean): boolean {
    if (opened || stream || !wanted) return false;
    this.refusals += 1;
    return standInAfter(this.refusals);
  }
}
