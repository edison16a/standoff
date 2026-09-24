import { getDeadline, waitUntil } from "@vercel/functions";
import { MAX_FRAME_BYTES, attachSocket } from "@/relay/attach-socket";
import { createBackend, deferredBackend } from "@/relay/create-backend";
import { routeContext } from "@/relay/route-context";
import { upgradeOnVercel } from "@/relay/vercel-upgrade";

/**
 * The game socket on Vercel. The local server answers this same path
 * itself before Next sees it, so this route only ever runs on Vercel,
 * where the runtime hands over the raw connection (see relay/vercel-upgrade).
 *
 * Each socket may land on a different function instance, so rooms and
 * messages go through Redis (see relay/create-backend). Vercel also ends
 * every function at its maximum duration, sockets included, so the relay
 * asks clients to move to a fresh socket shortly before that.
 */
export const dynamic = "force-dynamic";
/** The most every plan allows. Pro can raise this, and the relay adapts to whatever it is. */
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  if (!wantsWebSocket(request.headers)) {
    return new Response("This endpoint only speaks WebSocket.", { status: 426, headers: { Upgrade: "websocket" } });
  }
  const ctx = routeContext(request, deferredBackend(createBackend), getDeadline()?.getTime() ?? null);

  return upgradeOnVercel(
    (socket) => {
      // Listeners must be attached before any await, or a message the
      // client sends straight after opening could be dropped.
      const closed = attachSocket(socket, ctx);
      // Keep this invocation alive for as long as the socket is open.
      waitUntil(closed);
    },
    MAX_FRAME_BYTES,
  );
}

/**
 * Any sign this is a WebSocket request. A browser on HTTP/1.1 sends a
 * Sec-WebSocket-Key. One on HTTP/2 does not, and reaches us with only the
 * Upgrade or version header, so either counts.
 */
function wantsWebSocket(headers: Headers): boolean {
  return (
    headers.has("sec-websocket-key") ||
    headers.has("sec-websocket-version") ||
    headers.get("upgrade")?.toLowerCase() === "websocket"
  );
}
