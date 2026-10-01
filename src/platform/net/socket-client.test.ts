import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import { CONNECT_TIMEOUT_MS } from "./open-channel";
import { SocketClient, type SocketStatus } from "./socket-client";
import { FALLBACK_AFTER, preferStream, resetTransportChoice, webSocketOpened, WEBSOCKET_RETRY_MS } from "./transport-choice";

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
/** Every client a test made, closed after it, so no timer of theirs outlives the test. */
const clients: SocketClient[] = [];

function track(client: SocketClient): SocketClient {
  clients.push(client);
  return client;
}

function closeAll() {
  for (const client of clients.splice(0)) client.close();
}

function start() {
  statuses = [];
  const client = track(new SocketClient({
    onOpen: (send) => send({ type: "phone:join", code: "ABCD", token: "t" }),
    onMessage: () => undefined,
    onStatus: (status) => statuses.push(status),
  }));
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
    closeAll();
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

/** An EventSource counting how many were made. With `opens`, each says hello as the relay would. */
function stubStream({ opens = false } = {}) {
  const made = { count: 0 };
  vi.stubGlobal(
    "EventSource",
    class {
      private readonly listeners = new Map<string, (event: { data: string }) => void>();
      onerror: (() => void) | null = null;
      constructor() {
        made.count += 1;
        if (opens) queueMicrotask(() => this.listeners.get("hello")?.({ data: "id" }));
        else queueMicrotask(() => this.onerror?.());
      }
      addEventListener(type: string, listener: (event: { data: string }) => void) {
        this.listeners.set(type, listener);
      }
      close() {}
    },
  );
  vi.stubGlobal("CloseEvent", class extends Event {});
  return made;
}

describe("SocketClient opening", () => {
  beforeEach(() => {
    resetTransportChoice();
    FakeSocket.all = [];
    Object.assign(globalThis, { WebSocket: FakeSocket, location: { protocol: "https:", host: "game.test" } });
  });
  afterEach(() => {
    closeAll();
    vi.useRealTimers();
    Reflect.deleteProperty(globalThis, "location");
    vi.unstubAllGlobals();
  });

  const quiet = () => ({ onOpen: () => undefined, onMessage: () => undefined, onStatus: () => undefined });

  it("tells a handover socket from a reconnect", () => {
    const infos: boolean[] = [];
    const client = track(new SocketClient({ ...quiet(), onOpen: (_send, info) => infos.push(info.handover) }));
    client.connect();
    FakeSocket.all[0]!.open();
    FakeSocket.all[0]!.receive({ type: "server:rotate" });
    FakeSocket.all[1]!.open();
    expect(infos).toEqual([false, true]);
  });

  it("keeps using WebSockets after closing one that was still connecting", () => {
    const client = track(new SocketClient(quiet()));
    client.connect();
    client.redial();
    expect(FakeSocket.all).toHaveLength(2);
    expect(client.usesStream).toBe(false);
  });

  it("passes on a move that arrives on the handover socket", () => {
    const seen: string[] = [];
    const client = track(new SocketClient({ ...quiet(), onMessage: (message) => seen.push(message.type) }));
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
    const client = track(new SocketClient({ ...quiet(), onHandoverFailed: () => (failed += 1) }));
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

  it("retries a refused handover for a page with no handover handler too", () => {
    vi.useFakeTimers();
    // Phones pass no onHandoverFailed, and the retry once sat inside that optional call.
    const client = track(new SocketClient(quiet()));
    client.connect();
    const first = FakeSocket.all[0]!;
    first.open();
    first.receive({ type: "server:rotate" });
    FakeSocket.all[1]!.open();
    FakeSocket.all[1]!.receive({ type: "room:error", reason: "not-found" });
    vi.advanceTimersByTime(3000);
    expect(FakeSocket.all).toHaveLength(3);
  });

  it("goes to the stream at once where no WebSocket ever opened, and tries one again later", async () => {
    vi.useFakeTimers();
    const sources = stubStream({ opens: true });
    const client = track(new SocketClient(quiet()));
    client.connect();
    FakeSocket.all[0]!.close(1006);
    // No backoff: a WebSocket that would not open is no outage.
    expect(sources.count).toBe(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(client.usesStream).toBe(true);
    // The stream opened where the WebSocket did not, so they are blocked here for a while.
    expect(preferStream()).toBe(true);
    vi.advanceTimersByTime(WEBSOCKET_RETRY_MS + 1);
    expect(preferStream()).toBe(false);
    client.redial();
    expect(FakeSocket.all).toHaveLength(2);
  });

  it("blames the server, not WebSockets, when the stream fails as well", async () => {
    vi.useFakeTimers();
    const sources = stubStream();
    const client = track(new SocketClient(quiet()));
    client.connect();
    FakeSocket.all[0]!.close(1006);
    expect(sources.count).toBe(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(preferStream()).toBe(false);
    // The next try after the backoff is a WebSocket again.
    await vi.advanceTimersByTimeAsync(1000);
    expect(FakeSocket.all).toHaveLength(2);
  });

  it("keeps a page whose WebSockets worked on WebSockets through a blip", async () => {
    vi.useFakeTimers();
    const sources = stubStream({ opens: true });
    const client = track(new SocketClient(quiet()));
    client.connect();
    FakeSocket.all[0]!.open();
    FakeSocket.all[0]!.close(1006);
    // The server restarted or the network dropped: reconnects stay WebSockets.
    for (let n = 1; n < FALLBACK_AFTER; n++) {
      await vi.advanceTimersByTimeAsync(5000);
      FakeSocket.all.at(-1)!.close(1006);
    }
    expect(sources.count).toBe(0);
    await vi.advanceTimersByTimeAsync(5000);
    FakeSocket.all.at(-1)!.open();
    expect(client.usesStream).toBe(false);
    expect(preferStream()).toBe(false);
  });

  it("lets the stream stand in once after many failures in a row, without moving the page", async () => {
    vi.useFakeTimers();
    const sources = stubStream({ opens: true });
    const client = track(new SocketClient(quiet()));
    webSocketOpened();
    client.connect();
    for (let n = 1; n <= FALLBACK_AFTER; n++) {
      FakeSocket.all.at(-1)!.close(1006);
      await vi.advanceTimersByTimeAsync(5000);
    }
    expect(sources.count).toBe(1);
    expect(client.usesStream).toBe(true);
    expect(preferStream()).toBe(false);
  });

  it("moves a handover to the stream where no WebSocket ever opened", async () => {
    vi.useFakeTimers();
    const sources = stubStream({ opens: true });
    const client = track(new SocketClient(quiet()));
    client.connect();
    FakeSocket.all[0]!.close(1006);
    await vi.advanceTimersByTimeAsync(0);
    expect(client.usesStream).toBe(true);
    // Long after, a rotation tries a WebSocket again, and the stream stands in at once.
    vi.setSystemTime(Date.now() + WEBSOCKET_RETRY_MS + 1);
    client.rotateNow();
    expect(FakeSocket.all).toHaveLength(2);
    FakeSocket.all[1]!.close(1006);
    expect(sources.count).toBe(2);
  });

  it("tries a handover WebSocket again later where WebSockets work", () => {
    vi.useFakeTimers();
    const sources = stubStream();
    const client = track(new SocketClient(quiet()));
    client.connect();
    FakeSocket.all[0]!.open();
    FakeSocket.all[0]!.receive({ type: "server:rotate" });
    FakeSocket.all[1]!.close(1006);
    expect(sources.count).toBe(0);
    // The old socket carries on meanwhile.
    expect(client.usesStream).toBe(false);
    vi.advanceTimersByTime(3000);
    expect(FakeSocket.all).toHaveLength(3);
  });

  it("moves to a fresh socket on request, with the old one working till it confirms", () => {
    const client = track(new SocketClient(quiet()));
    client.connect();
    FakeSocket.all[0]!.open();
    expect(client.rotateNow()).toBe(true);
    expect(client.rotateNow()).toBe(false);
    expect(FakeSocket.all).toHaveLength(2);
    expect(FakeSocket.all[0]!.readyState).toBe(1);
  });

  it("gives the old socket a last word once the new one confirms", () => {
    const last: string[] = [];
    const client = track(
      new SocketClient({
        ...quiet(),
        onHandedOver: (confirmation, sendOld) => {
          last.push(confirmation.type);
          sendOld({ type: "host:echo", nonce: "n".repeat(20) });
        },
      }),
    );
    client.connect();
    const [first] = FakeSocket.all;
    first!.open();
    client.rotateNow();
    FakeSocket.all[1]!.open();
    FakeSocket.all[1]!.receive({ type: "phone:joined", code: "ABCD", game: "g", seats: 2, seat: 1, token: "t", hostHere: true, name: "Ann" });
    expect(last).toEqual(["phone:joined"]);
    expect(first!.types()).toEqual(["host:echo"]);
    expect(first!.readyState).toBe(3);
  });

  it("gives up on a connection that hangs and dials again", async () => {
    vi.useFakeTimers();
    stubStream();
    const client = track(new SocketClient(quiet()));
    client.connect();
    FakeSocket.all[0]!.open();
    FakeSocket.all[0]!.close(1006);
    await vi.advanceTimersByTimeAsync(1000);
    // Dialled while the server restarted: it neither opens nor fails.
    const stuck = FakeSocket.all[1]!;
    await vi.advanceTimersByTimeAsync(CONNECT_TIMEOUT_MS);
    expect(stuck.readyState).toBe(3);
    await vi.advanceTimersByTimeAsync(1000);
    expect(FakeSocket.all).toHaveLength(3);
  });

  it("leaves an open connection alone however long it lasts", async () => {
    vi.useFakeTimers();
    const client = track(new SocketClient(quiet()));
    client.connect();
    FakeSocket.all[0]!.open();
    await vi.advanceTimersByTimeAsync(CONNECT_TIMEOUT_MS * 2);
    expect(FakeSocket.all[0]!.readyState).toBe(1);
  });

  it("starts on the stream when asked", () => {
    const sources = stubStream();
    const client = track(new SocketClient(quiet(), { stream: true }));
    client.connect();
    expect(client.usesStream).toBe(true);
    expect(sources.count).toBe(1);
    expect(FakeSocket.all).toHaveLength(0);
    client.close();
  });
});
