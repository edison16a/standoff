import { randomUUID } from "node:crypto";
import { channels } from "../channels";
import { RateLimiter } from "../rate-limiter";
import { RelayConnection } from "../relay-connection";
import type { RelayContext } from "../relay-types";
import { parseBatch } from "./batch";

/** A comment line now and then stops proxies from closing a quiet stream. */
const KEEPALIVE_MS = 15_000;

/**
 * The downstream half of the HTTP fallback: a Server-Sent Events stream
 * standing in for a WebSocket. The relay writes to it just as it would to
 * a socket. What the client sends arrives as POSTs that any instance may
 * handle, so those reach the stream through its own channel on the bus.
 *
 * The first event tells the client its stream id, and it is only sent
 * once that channel is listening, so no early POST can go missing.
 */
export function openEventStream(ctx: RelayContext, signal: AbortSignal): Response {
  const id = randomUUID();
  const encoder = new TextEncoder();
  let finish = () => {};

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const write = (text: string) => {
        if (open) controller.enqueue(encoder.encode(text));
      };
      const relay = new RelayConnection(
        {
          send: (data) => write(`data: ${data}\n\n`),
          // The client closes on its own side and treats this like a socket close code.
          close: (code) => {
            write(`event: close\ndata: ${code ?? 1000}\n\n`);
            finish();
          },
        },
        ctx,
      );
      const limiter = new RateLimiter();
      const unsubscribe = await ctx.backend.bus.subscribe(channels.inbox(id), (batch) => {
        for (const envelope of parseBatch(batch)) if (limiter.take()) relay.receive(envelope);
      });
      const keepalive = setInterval(() => write(": keepalive\n\n"), KEEPALIVE_MS);

      finish = () => {
        if (!open) return;
        open = false;
        clearInterval(keepalive);
        relay.disconnect();
        void unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed by the client going away.
        }
      };
      signal.addEventListener("abort", () => finish(), { once: true });
      if (signal.aborted) return finish();
      write(`event: hello\ndata: ${id}\n\n`);
    },
    cancel() {
      finish();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      // Asks any proxy in the way to pass events on as they come.
      "X-Accel-Buffering": "no",
    },
  });
}
