import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import { clientEnvelopeSchema, SOCKET_PATH, type ServerEnvelope } from "../../src/shared/protocol";
import type { Peer } from "../rooms/peer";
import type { RoomRegistry } from "../rooms/room-registry";
import { RateLimiter } from "./rate-limiter";

/** Motion frames are tiny. Anything this big is not from our client. */
const MAX_FRAME_BYTES = 16 * 1024;
/** Sockets that miss a ping for this long are treated as gone. */
const HEARTBEAT_MS = 10_000;

/**
 * Wraps a live socket in the Peer shape the rooms expect. Sends to a
 * socket that is already closing are dropped quietly, because a phone that
 * walks out of WiFi range should not crash anyone else's game.
 */
function toPeer(socket: WebSocket): Peer {
  return {
    send(message: ServerEnvelope) {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    },
    close() {
      socket.close(4000, "replaced");
    },
  };
}

/**
 * Accepts WebSocket upgrades on /ws and connects them to the room
 * registry. Returns the upgrade handler so both the HTTP and HTTPS servers
 * can share one set of rooms.
 */
export function createSocketServer(registry: RoomRegistry) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME_BYTES });
  const alive = new WeakMap<WebSocket, boolean>();

  wss.on("connection", (socket: WebSocket) => {
    const peer = toPeer(socket);
    const limiter = new RateLimiter();
    alive.set(socket, true);

    socket.on("pong", () => alive.set(socket, true));
    socket.on("message", (data: RawData, isBinary: boolean) => {
      if (isBinary || !limiter.take()) return;
      const envelope = parse(data);
      if (envelope) registry.handle(peer, envelope);
    });
    socket.on("close", () => registry.disconnect(peer));
    socket.on("error", () => socket.terminate());
  });

  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (!alive.get(socket)) {
        socket.terminate();
        continue;
      }
      alive.set(socket, false);
      socket.ping();
    }
  }, HEARTBEAT_MS);
  heartbeat.unref();

  /** Returns true if it took the upgrade, false to let Next handle it. */
  function handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): boolean {
    const path = new URL(request.url ?? "/", "http://placeholder").pathname;
    if (path !== SOCKET_PATH) return false;
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request));
    return true;
  }

  function close() {
    clearInterval(heartbeat);
    for (const socket of wss.clients) socket.close(1001, "server shutting down");
    wss.close();
  }

  return { handleUpgrade, close };
}

function parse(data: RawData) {
  try {
    const result = clientEnvelopeSchema.safeParse(JSON.parse(data.toString()));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
