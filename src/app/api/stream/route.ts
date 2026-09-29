import { getDeadline } from "@vercel/functions";
import { createBackend } from "@/platform/relay/create-backend";
import { routeContext } from "@/platform/relay/route-context";
import { deliverBatch, MAX_BATCH_BYTES } from "@/platform/relay/stream/batch";
import { openEventStream } from "@/platform/relay/stream/event-stream";

/**
 * The HTTP fallback for clients whose WebSocket will not open. Chrome and
 * Firefox send WebSockets over HTTP/2 wherever the edge offers it, and
 * Vercel's edge answered those with a 502 when it did. It did not offer it
 * when last checked, so few clients should need this. GET opens an event
 * stream that carries messages down, and POST carries a batch of messages up.
 *
 * Unlike the socket route this one also runs locally, inside the custom
 * server's process, where it shares the same rooms.
 */
export const dynamic = "force-dynamic";
/** Same limit as the socket. The relay moves the client to a new stream before it runs out. */
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const backend = await createBackend();
  return openEventStream(routeContext(request, backend, getDeadline()?.getTime() ?? null), request.signal);
}

export async function POST(request: Request): Promise<Response> {
  const stream = new URL(request.url).searchParams.get("s") ?? "";
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BATCH_BYTES) return new Response(null, { status: 413 });
  const { bus } = await createBackend();
  return new Response(null, { status: await deliverBatch(bus, stream, await request.text()) });
}
