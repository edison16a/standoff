import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import { SocketClient, type SocketStatus } from "./socket-client";
import { preferStream, webSocketOpened, WEBSOCKET_RETRY_MS } from "./transport-choice";

/** Just enough of a browser WebSocket to drive the client by hand. */
class FakeSocket {
  static all: FakeSocket[] = [];
  readyState = 0;
  bufferedAmount = 0;
  readonly sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;

  constructor() {
    FakeSocket.all.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close(code = 1000) {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.onclose?.({ code });
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(message: ServerEnvelope) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  types() {
    return this.sent.map((data) => (JSON.parse(data) as ClientEnvelope).type);
  }
}

const JAB: ClientEnvelope = { type: "phone:send", payload: { kind: "strike", action: "jab" } };
const MOTION: ClientEnvelope = { type: "phone:send", payload: { kind: "motion", pitch: 0, yaw: 0, roll: 0, move: 0 } };

let statuses: SocketStatus[];

function start() {
  statuses = [];
  const client = new SocketClient({
    onOpen: (send) => send({ type: "phone:join", code: "ABCD", token: "t" }),
    onMessage: () => undefined,
    onStatus: (status) => statuses.push(status),
  });
  client.connect();
  const first = FakeSocket.all[0]!;
  first.open();
  first.receive({ type: "phone:joined", code: "ABCD", game: "blade-clash", seats: 2, seat: 1, token: "t", hostHere: true, name: "Ann" });
  // The server asks for a handover, and the client dials a second socket.
  first.receive({ type: "server:rotate" });
  return { client, first, second: FakeSocket.all[1]! };
}

describe("SocketClient handover", () => {
  beforeEach(() => {
    FakeSocket.all = [];
    Object.assign(globalThis, { WebSocket: FakeSocket, location: { protocol: "https:", host: "game.test" } });
  });
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "location");
  });

  it("sends again on the old socket what went out on a new one that never confirmed", () => {
    const { client, first, second } = start();
    second.open();
    client.send(JAB);
    expect(second.types()).toEqual(["phone:join", "phone:send"]);
    second.receive({ type: "room:error", reason: "unavailable" });
    expect(first.types()).toEqual(["phone:join", "phone:send"]);
  });

  it("reconnects after a kick its own dead handover socket caused", () => {
    const { first, second } = start();
    second.open();
    second.close(1006);
    first.close(4000);
    expect(statuses).not.toContain("replaced");
    expect(statuses.at(-1)).toBe("reconnecting");
  });

  it("drops motion when the socket it will really use is backed up", () => {
    const { client, first } = start();
    first.bufferedAmount = 100_000;
    client.sendLossy(MOTION);
    expect(first.types()).toEqual(["phone:join"]);
  });
});

/** An EventSource that never opens, counting how many were made. */
function stubStream() {
  const made = { count: 0 };
  vi.stubGlobal(
    "EventSource",
    class {
      constructor() {
        made.count += 1;
      }
      addEventListener() {}
      close() {}
    },
  );
  vi.stubGlobal("CloseEvent", class extends Event {});
  return made;
}

describe("SocketClient opening", () => {
  beforeEach(() => {
    webSocketOpened();
    FakeSocket.all = [];
    Object.assign(globalThis, { WebSocket: FakeSocket, location: { protocol: "https:", host: "game.test" } });
  });
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(globalThis, "location");
    vi.unstubAllGlobals();
  });

  const quiet = () => ({ onOpen: () => undefined, onMessage: () => undefined, onStatus: () => undefined });

  it("tells a handover socket from a reconnect", () => {
    const infos: boolean[] = [];
    const client = new SocketClient({ ...quiet(), onOpen: (_send, info) => infos.push(info.handover) });
    client.connect();
    FakeSocket.all[0]!.open();
    FakeSocket.all[0]!.receive({ type: "server:rotate" });
    FakeSocket.all[1]!.open();
    expect(infos).toEqual([false, true]);
  });

  it("keeps using WebSockets after closing one that was still connecting", () => {
    const client = new SocketClient(quiet());
    client.connect();
    client.redial();
    expect(FakeSocket.all).toHaveLength(2);
    expect(client.usesStream).toBe(false);
  });

  it("passes on a move that arrives on the handover socket", () => {
    const seen: string[] = [];
    const client = new SocketClient({ ...quiet(), onMessage: (message) => seen.push(message.type) });
    client.connect();
    FakeSocket.all[0]!.open();
    FakeSocket.all[0]!.receive({ type: "server:rotate" });
    FakeSocket.all[1]!.open();
    FakeSocket.all[1]!.receive({ type: "room:moved", code: "WXYZ" });
    expect(seen).toEqual(["room:moved"]);
  });

  it("retries a refused handover a few times, and says so each time", () => {
    vi.useFakeTimers();
    let failed = 0;
    const client = new SocketClient({ ...quiet(), onHandoverFailed: () => (failed += 1) });
    client.connect();
    const first = FakeSocket.all[0]!;
    first.open();
    first.receive({ type: "server:rotate" });
    for (let attempt = 1; attempt <= 3; attempt++) {
      const next = FakeSocket.all.at(-1)!;
      next.open();
      next.receive({ type: "room:error", reason: "not-found" });
      expect(failed).toBe(attempt);
      vi.advanceTimersByTime(3000);
    }
    // One refused handover and two retries, then it waits for the next rotate.
    expect(FakeSocket.all).toHaveLength(4);
    expect(first.readyState).toBe(1);
  });

  it("goes to the stream at once when a WebSocket will not open, and tries one again later", () => {
    vi.useFakeTimers();
    const sources = stubStream();
    const client = new SocketClient(quiet());
    client.connect();
    FakeSocket.all[0]!.close(1006);
    // No backoff: a WebSocket that would not open is no outage.
    expect(sources.count).toBe(1);
    expect(client.usesStream).toBe(true);
    expect(preferStream()).toBe(true);
    vi.advanceTimersByTime(WEBSOCKET_RETRY_MS + 1);
    expect(preferStream()).toBe(false);
    client.redial();
    expect(FakeSocket.all).toHaveLength(2);
    client.close();
  });

  it("moves a handover to the stream when its WebSocket will not open", () => {
    const sources = stubStream();
    const client = new SocketClient(quiet());
    client.connect();
    FakeSocket.all[0]!.open();
    FakeSocket.all[0]!.receive({ type: "server:rotate" });
    FakeSocket.all[1]!.close(1006);
    expect(sources.count).toBe(1);
    // The old socket carries on meanwhile.
    expect(client.usesStream).toBe(false);
    client.close();
  });

  it("starts on the stream when asked", () => {
    const sources = stubStream();
    const client = new SocketClient(quiet(), { stream: true });
    client.connect();
    expect(client.usesStream).toBe(true);
    expect(sources.count).toBe(1);
    expect(FakeSocket.all).toHaveLength(0);
    client.close();
  });
});
