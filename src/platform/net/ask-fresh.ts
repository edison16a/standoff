import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import { openChannel, readEnvelope, type Channel } from "./open-channel";

/** `timeout`: no answer in time. `transport`: the connection closed first. */
export type AskFailure = "timeout" | "transport";

export interface AskOptions {
  /** Use the HTTP stream. A WebSocket that never opens is tried once more over the stream anyway. */
  stream: boolean;
  timeoutMs: number;
}

/**
 * Sends one message over a throwaway connection and waits for the one
 * answer `pick` accepts. A fresh connection may land on any server
 * instance, which is the point: it reaches the relay the way a phone
 * would, or an instance the page's own socket is not on. The connection is
 * closed on every path, and a WebSocket that never opens is tried once
 * over the stream within the same time.
 */
export function askFresh<T>(message: ClientEnvelope, pick: (reply: ServerEnvelope) => T | null, options: AskOptions): Promise<T | AskFailure> {
  return new Promise((resolve) => {
    let channel: Channel;
    let settled = false;
    const finish = (result: T | AskFailure) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      quiet(channel);
      channel.close(1000);
      resolve(result);
    };
    const timer = setTimeout(() => finish("timeout"), options.timeoutMs);
    const open = (overStream: boolean) => {
      channel = openChannel(overStream);
      let opened = false;
      channel.onopen = () => {
        opened = true;
        channel.send(JSON.stringify(message));
      };
      channel.onmessage = (event: MessageEvent<string>) => {
        const reply = readEnvelope(event.data);
        const picked = reply ? pick(reply) : null;
        if (picked !== null) finish(picked);
      };
      channel.onclose = () => {
        if (opened || overStream) return finish("transport");
        quiet(channel);
        open(true);
      };
    };
    open(options.stream);
  });
}

function quiet(channel: Channel): void {
  channel.onopen = null;
  channel.onmessage = null;
  channel.onclose = null;
}
