import { experimental_upgradeWebSocket, getDeadline, waitUntil } from "@vercel/functions";
import { MAX_FRAME_BYTES, attachSocket } from "@/relay/attach-socket";
import { createBackend, deferredBackend, findRedisUrl } from "@/relay/create-backend";

/**
 * The game socket on Vercel. The local server answers this same path
 * itself before Next sees it, so this route only ever runs on Vercel,
 * where the runtime hands over the raw connection.
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
  // Sec-WebSocket-Key travels end to end, unlike Upgrade, which a proxy may strip.
  if (!request.headers.get("sec-websocket-key")) {
    return new Response("This endpoint only speaks WebSocket.", { status: 426, headers: { Upgrade: "websocket" } });
  }
  const origin = requestOrigin(request);
  const pending = createBackend();
  const deadline = getDeadline()?.getTime() ?? null;

  return experimental_upgradeWebSocket(
    (socket) => {
      // Listeners must be attached before any await, or a message the
      // client sends straight after opening could be dropped.
      const closed = attachSocket(socket, {
        backend: deferredBackend(pending),
        joinUrlFor: (code) => `${origin}/join/${code}`,
        now: Date.now,
        sharedRooms: findRedisUrl() !== null,
        deadline,
      });
      // Keep this invocation alive for as long as the socket is open.
      waitUntil(closed);
    },
    { maxPayload: MAX_FRAME_BYTES },
  );
}

/** The address the host used to reach us, so the QR code points at the same deployment. */
function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `https://${host}`;
}
