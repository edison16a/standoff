import { clientEnvelopeSchema } from "@/shared/protocol";
import { RateLimiter } from "./rate-limiter";
import { RelayConnection, type RelayContext } from "./relay-connection";

/** Motion frames are tiny. Anything this big is not from our client. */
export const MAX_FRAME_BYTES = 16 * 1024;
/** Sockets that miss a ping for this long are treated as gone. */
const HEARTBEAT_MS = 10_000;

/**
 * The event surface shared by a `ws` socket on the local server and the
 * socket Vercel hands a function. Both are Node `ws` style emitters.
 */
export interface NodeSocket {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  terminate(): void;
  ping(): void;
  on(event: "message", listener: (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => void): unknown;
  on(event: "close", listener: () => void): unknown;
  on(event: "error", listener: (error: Error) => void): unknown;
  on(event: "pong", listener: () => void): unknown;
}

const OPEN = 1;

/**
 * Connects one live socket to the relay: parses and validates each frame,
 * rate limits, and pings so a phone that vanished off the network is
 * noticed within a few seconds instead of whenever TCP gives up.
 * Returns a promise that settles when the socket closes.
 */
export function attachSocket(socket: NodeSocket, ctx: RelayContext): Promise<void> {
  const connection = new RelayConnection(
    {
      send: (data) => {
        if (socket.readyState === OPEN) socket.send(data);
      },
      close: (code, reason) => socket.close(code, reason),
    },
    ctx,
  );
  const limiter = new RateLimiter();
  let alive = true;
  const heartbeat = setInterval(() => {
    if (!alive) {
      socket.terminate();
      return;
    }
    alive = false;
    socket.ping();
  }, HEARTBEAT_MS);

  socket.on("pong", () => (alive = true));
  socket.on("message", (data, isBinary) => {
    alive = true;
    if (isBinary || !limiter.take()) return;
    const envelope = parse(data);
    if (envelope) connection.receive(envelope);
  });
  socket.on("error", () => socket.terminate());

  return new Promise((resolve) => {
    socket.on("close", () => {
      clearInterval(heartbeat);
      connection.disconnect();
      void connection.settled().then(resolve);
    });
  });
}

function parse(data: Buffer | ArrayBuffer | Buffer[]) {
  try {
    const text = Array.isArray(data) ? Buffer.concat(data).toString() : Buffer.from(data as ArrayBuffer).toString();
    if (text.length > MAX_FRAME_BYTES) return null;
    const result = clientEnvelopeSchema.safeParse(JSON.parse(text));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
