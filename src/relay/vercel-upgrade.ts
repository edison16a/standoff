import { randomBytes } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";

/** Where the Vercel runtime keeps the current request's context. `@vercel/functions` reads the same slot. */
const REQUEST_CONTEXT = Symbol.for("@vercel/request-context");

type UpgradeHook = () => { req: IncomingMessage; socket: Duplex; head: Buffer };

function runtimeUpgradeHook(): UpgradeHook | null {
  const holder = (globalThis as Record<symbol, { get?: () => { upgradeWebSocket?: UpgradeHook } } | undefined>)[REQUEST_CONTEXT];
  const hook = holder?.get?.()?.upgradeWebSocket;
  return typeof hook === "function" ? hook : null;
}

/**
 * Takes over the connection from the Vercel runtime and completes the
 * WebSocket handshake. This does what `experimental_upgradeWebSocket` from
 * `@vercel/functions` does, with one difference that decides whether
 * Chrome can connect at all.
 *
 * Chrome and Firefox open a WebSocket over the page's existing HTTP/2
 * connection when the server allows it (RFC 8441), and Vercel's edge does.
 * An HTTP/2 WebSocket has no Sec-WebSocket-Key, so the request the edge
 * hands the function has none either, and `ws` refuses to finish a
 * handshake without one. The edge then answers the browser with a 502 and
 * the game sits on "Connecting". Filling in the missing handshake headers
 * lets `ws` complete the upgrade. The key only exists to prove the server
 * speaks WebSocket, and the edge, not the browser, is the one reading the
 * reply here.
 */
export async function upgradeOnVercel(handler: (socket: WebSocket) => void, maxPayload: number): Promise<Response> {
  const hook = runtimeUpgradeHook();
  if (!hook) throw new Error("This route only accepts WebSockets on Vercel. Locally, the custom server answers it.");
  const { req, socket, head } = hook();
  completeHandshakeHeaders(req);

  const server = new WebSocketServer({ noServer: true, maxPayload });
  const ws = await new Promise<WebSocket>((resolve, reject) => {
    const fail = () => reject(new Error("The connection closed before the WebSocket upgrade finished."));
    socket.once("error", fail);
    socket.once("close", fail);
    server.handleUpgrade(req, socket, head, (upgraded) => {
      socket.removeListener("error", fail);
      socket.removeListener("close", fail);
      resolve(upgraded);
    });
  });
  handler(ws);
  // The 101 has already gone out on the raw socket. Next still expects a Response.
  return new Response(null, { status: 204 });
}

/** Adds whatever an HTTP/2 WebSocket request lost on its way to an HTTP/1.1 handshake. */
export function completeHandshakeHeaders(req: IncomingMessage): void {
  const headers = req.headers;
  headers["sec-websocket-key"] ??= randomBytes(16).toString("base64");
  headers["sec-websocket-version"] ??= "13";
  headers.upgrade ??= "websocket";
  if (req.method === "CONNECT") req.method = "GET";
}
