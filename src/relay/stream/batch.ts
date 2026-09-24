import type { ClientEnvelope } from "@/shared/protocol";
import type { Bus } from "../backend";
import { channels } from "../channels";
import { parseEnvelope } from "../parse-envelope";

/** A round trip's worth of motion frames plus a strike or two fits many times over. */
export const MAX_BATCH_BYTES = 64 * 1024;
const MAX_BATCH_LENGTH = 200;
/** Stream ids are UUIDs. Checking the shape keeps junk off the bus. */
const STREAM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Takes one POST from an HTTP fallback client and passes it to its event
 * stream through the bus, since the stream may be held by another server
 * instance. Returns the HTTP status to answer with. 410 means nobody holds
 * that stream any more, so the client should open a new one.
 */
export async function deliverBatch(bus: Bus, stream: string, body: string): Promise<number> {
  if (!STREAM_ID.test(stream)) return 400;
  if (body.length > MAX_BATCH_BYTES) return 413;
  if (!readBatch(body)) return 400;
  const reached = await bus.publish(channels.inbox(stream), body);
  return reached > 0 ? 204 : 410;
}

/** The valid envelopes in a batch, in order. Anything else is dropped. */
export function parseBatch(body: string): ClientEnvelope[] {
  const items = readBatch(body) ?? [];
  return items.map((item) => parseEnvelope(JSON.stringify(item))).filter((envelope) => envelope !== null);
}

function readBatch(body: string): unknown[] | null {
  try {
    const parsed: unknown = JSON.parse(body);
    return Array.isArray(parsed) && parsed.length <= MAX_BATCH_LENGTH ? parsed : null;
  } catch {
    return null;
  }
}
