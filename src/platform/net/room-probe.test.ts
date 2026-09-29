import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerEnvelope } from "@/platform/protocol";
import { makeNonce, probeRoom } from "./room-probe";

/** A browser WebSocket driven by hand. */
class FakeSocket {
  static last: FakeSocket;
  readyState = 0;
  sent: { type: string; nonce: string }[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  constructor() {
    FakeSocket.last = this;
  }
  send(data: string) {
    this.sent.push(JSON.parse(data) as { type: string; nonce: string });
  }
  close() {
    this.closed = true;
    this.readyState = 3;
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(message: ServerEnvelope) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

const ROOM = { code: "ABCD", token: "t".repeat(20) };

describe("probeRoom", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(globalThis, { WebSocket: FakeSocket, location: { protocol: "https:", host: "game.test" } });
  });
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(globalThis, "location");
  });

  it("sends a check with a fresh nonce and passes on the relay's answer", async () => {
    const pending = probeRoom(ROOM, { stream: false });
    const socket = FakeSocket.last;
    socket.open();
    const [sent] = socket.sent;
    expect(sent).toMatchObject({ type: "probe:room", code: "ABCD", token: ROOM.token });
    socket.receive({ type: "probe:result", nonce: sent!.nonce, ok: true });
    expect(await pending).toEqual({ ok: true });
    expect(socket.closed).toBe(true);
  });

  it("ignores an answer to someone else's check", async () => {
    const pending = probeRoom(ROOM, { stream: false });
    const socket = FakeSocket.last;
    socket.open();
    socket.receive({ type: "probe:result", nonce: "someone-elses-nonce", ok: true });
    socket.receive({ type: "probe:result", nonce: socket.sent[0]!.nonce, ok: false, reason: "not-found" });
    expect(await pending).toEqual({ ok: false, reason: "not-found" });
  });

  it("times out, and closes the channel", async () => {
    const pending = probeRoom(ROOM, { stream: false, timeoutMs: 1000 });
    const socket = FakeSocket.last;
    vi.advanceTimersByTime(1001);
    expect(await pending).toEqual({ ok: false, reason: "timeout" });
    expect(socket.closed).toBe(true);
  });

  it("reports a connection that closed before any answer", async () => {
    const pending = probeRoom(ROOM, { stream: false });
    const socket = FakeSocket.last;
    socket.onclose?.({ code: 1006 });
    expect(await pending).toEqual({ ok: false, reason: "transport" });
    expect(socket.closed).toBe(true);
    // The timer went with it.
    expect(vi.getTimerCount()).toBe(0);
  });

  it("makes nonces the relay accepts", () => {
    for (let i = 0; i < 20; i++) expect(makeNonce()).toMatch(/^[A-Za-z0-9_-]{16,40}$/);
  });
});
