import type { Slot } from "@/shared/players";
import type { ServerEnvelope } from "@/shared/protocol";

/** Channel names on the bus. Everything for one room shares a prefix. */
export const channels = {
  host: (code: string) => `standoff:room:${code}:host`,
  seat: (code: string, slot: Slot) => `standoff:room:${code}:seat:${slot}`,
  /** What an HTTP fallback client posted, on its way to whichever instance holds its stream. */
  inbox: (conn: string) => `standoff:conn:${conn}:in`,
};

/**
 * What travels on a channel. Most of it is an envelope to hand straight
 * to the socket. A kick tells an old connection that a newer one (the same
 * player after a reload, maybe on another server instance) has its seat.
 */
export type BusMessage = { kind: "deliver"; envelope: ServerEnvelope } | { kind: "kick"; conn: string };

export function encode(message: BusMessage): string {
  return JSON.stringify(message);
}

export function decode(raw: string): BusMessage | null {
  try {
    const parsed = JSON.parse(raw) as BusMessage;
    return parsed.kind === "deliver" || parsed.kind === "kick" ? parsed : null;
  } catch {
    return null;
  }
}
