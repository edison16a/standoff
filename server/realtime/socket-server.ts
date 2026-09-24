import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import { MAX_FRAME_BYTES, attachSocket } from "../../src/relay/attach-socket";
import type { RelayContext } from "../../src/relay/relay-connection";
import { SOCKET_PATH } from "../../src/shared/protocol";

/**
 * Accepts WebSocket upgrades on the game socket path and hands each one to
 * the relay. Returns the upgrade handler so the HTTP and HTTPS listeners
 * share one set of rooms.
 */
export function createSocketServer(ctx: RelayContext) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME_BYTES });
  wss.on("connection", (socket) => void attachSocket(socket, ctx));

  /** Returns true if it took the upgrade, false to let Next handle it. */
  function handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): boolean {
    const path = new URL(request.url ?? "/", "http://placeholder").pathname;
    if (path !== SOCKET_PATH) return false;
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request));
    return true;
  }

  function close() {
    for (const socket of wss.clients) socket.close(1001, "server shutting down");
    wss.close();
  }

  return { handleUpgrade, close };
}
