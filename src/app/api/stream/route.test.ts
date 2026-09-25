import { describe, expect, it } from "vitest";
import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import { GET, POST } from "./route";

const ORIGIN = "https://standoff.example";

interface StreamEvent {
  event: string;
  data: string;
}

/** Opens an event stream the way EventSource would and collects what arrives. */
async function openStream() {
  const abort = new AbortController();
  const response = await GET(new Request(`${ORIGIN}/api/stream`, { signal: abort.signal }));
  expect(response.headers.get("content-type")).toContain("text/event-stream");
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const events: StreamEvent[] = [];
  let buffer = "";
  void (async () => {
    for (;;) {
      const { value, done } = await reader.read().catch(() => ({ value: undefined, done: true as const }));
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      for (let end = buffer.indexOf("\n\n"); end >= 0; end = buffer.indexOf("\n\n")) {
        const lines = buffer.slice(0, end).split("\n");
        buffer = buffer.slice(end + 2);
        const field = (name: string) => lines.find((line) => line.startsWith(`${name}: `))?.slice(name.length + 2);
        const data = field("data");
        if (data !== undefined) events.push({ event: field("event") ?? "message", data });
      }
    }
  })();

  const waitFor = async (match: (event: StreamEvent) => boolean) => {
    for (let i = 0; i < 100; i++) {
      const found = events.find(match);
      if (found) return found;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`not found in ${JSON.stringify(events)}`);
  };
  const id = (await waitFor((event) => event.event === "hello")).data;
  const message = async <T extends ServerEnvelope["type"]>(type: T) => {
    const found = await waitFor((event) => event.event === "message" && (JSON.parse(event.data) as ServerEnvelope).type === type);
    return JSON.parse(found.data) as Extract<ServerEnvelope, { type: T }>;
  };
  const post = (batch: ClientEnvelope[]) => postRaw(id, JSON.stringify(batch));
  return { id, message, post, close: () => abort.abort() };
}

function postRaw(stream: string, body: string) {
  return POST(new Request(`${ORIGIN}/api/stream?s=${stream}`, { method: "POST", body }));
}

describe("the HTTP stream fallback route", () => {
  it("hosts a room and relays between host and phone", async () => {
    const host = await openStream();
    expect((await host.post([{ type: "host:create", game: "blade-clash", seats: 2 }])).status).toBe(204);
    const created = await host.message("room:created");
    expect(created.joinUrl).toBe(`${ORIGIN}/join/${created.code}`);

    const phone = await openStream();
    await phone.post([
      { type: "phone:join", code: created.code },
      { type: "phone:send", payload: { kind: "strike", action: "jab" } },
    ]);
    expect((await phone.message("phone:joined")).seat).toBe(1);
    expect((await host.message("peer:message")).payload).toEqual({ kind: "strike", action: "jab" });
    host.close();
    phone.close();
  });

  it("tells a client when nobody holds its stream any more", async () => {
    const stream = await openStream();
    stream.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect((await stream.post([{ type: "host:create", game: "blade-clash", seats: 2 }])).status).toBe(410);
  });

  it("refuses posts that are not a batch for a real stream id", async () => {
    expect((await postRaw("not-an-id", "[]")).status).toBe(400);
    expect((await postRaw(crypto.randomUUID(), "{}")).status).toBe(400);
  });
});
