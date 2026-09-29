import { SOCKET_PATH, type ServerEnvelope } from "@/platform/protocol";
import { StreamChannel } from "./stream-channel";

/** A WebSocket, or the HTTP stream that stands in for one. */
export type Channel = WebSocket | StreamChannel;

export const OPEN = 1;

/** Opens a WebSocket to the relay, or the HTTP stream instead when asked. */
export function openChannel(stream: boolean): Channel {
  if (stream) return new StreamChannel();
  const scheme = location.protocol === "https:" ? "wss" : "ws";
  return new WebSocket(`${scheme}://${location.host}${SOCKET_PATH}`);
}

/** Lets the fallback be tried anywhere: set "standoff:transport" to "stream" in local storage. */
export function streamRequested(): boolean {
  try {
    return localStorage.getItem("standoff:transport") === "stream";
  } catch {
    return false;
  }
}

/** One message from the relay, or null for anything that is not JSON. */
export function readEnvelope(raw: string): ServerEnvelope | null {
  try {
    return JSON.parse(raw) as ServerEnvelope;
  } catch {
    return null;
  }
}
