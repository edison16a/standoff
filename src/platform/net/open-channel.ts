import { SOCKET_PATH, type ClientEnvelope, type ServerEnvelope } from "@/platform/protocol";
import { StreamChannel } from "./stream-channel";

/** A WebSocket, or the HTTP stream that stands in for one. */
export type Channel = WebSocket | StreamChannel;

export const OPEN = 1;

/** Opens a WebSocket to the relay, or the HTTP stream instead when asked (see transport-choice). */
export function openChannel(stream: boolean): Channel {
  if (stream) return new StreamChannel();
  const scheme = location.protocol === "https:" ? "wss" : "ws";
  return new WebSocket(`${scheme}://${location.host}${SOCKET_PATH}`);
}

/** One message from the relay, or null for anything that is not JSON. */
export function readEnvelope(raw: string): ServerEnvelope | null {
  try {
    return JSON.parse(raw) as ServerEnvelope;
  } catch {
    return null;
  }
}

/**
 * What makes a lossy frame replaceable: the same kind to the same place.
 * On the stream only the newest such frame waits for the next POST.
 */
export function lossyKey(message: ClientEnvelope): string | undefined {
  if (message.type === "host:send") return `host:${message.to}:${message.payload.kind}`;
  if (message.type === "phone:send") return `phone:${message.payload.kind}`;
  return undefined;
}
