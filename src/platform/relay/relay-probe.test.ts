import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connectTo, flush, memoryBackend, type Connected } from "@/platform/testing/relay-kit";
import type { Backend } from "./backend";
import { ECHO_WAIT_MS } from "./relay-probe";

let backend: Backend;
const connect = (on: Backend = backend) => connectTo(on, Date.now);
const NONCE = "abcdefghijklmnop1234";

async function openRoom() {
  const host = connect();
  await host.send({ type: "host:create", game: "blade-clash", seats: 2 });
  const { code, token } = host.socket.last("room:created")!;
  return { host, code, token };
}

/** Echoes every check the way the host page does. */
function answerChecks(host: Connected) {
  const socket = host.socket;
  const send = socket.send.bind(socket);
  socket.send = (data: string) => {
    send(data);
    const message = JSON.parse(data) as { type: string; nonce?: string };
    if (message.type === "room:probe") host.connection.receive({ type: "host:echo", nonce: message.nonce! });
  };
}

async function probe(code: string, token: string, on: Backend = backend) {
  const checker = connect(on);
  await checker.send({ type: "probe:room", code, token, nonce: NONCE });
  await flush();
  return checker;
}

describe("checking a room", () => {
  beforeEach(() => {
    backend = memoryBackend();
  });
  afterEach(() => vi.useRealTimers());

  it("passes once the host echoes, then closes the connection", async () => {
    const { host, code, token } = await openRoom();
    answerChecks(host);
    const checker = await probe(code, token);
    expect(checker.socket.last("probe:result")).toEqual({ type: "probe:result", nonce: NONCE, ok: true });
    expect(checker.socket.closedWith).toBe(1000);
    // A check is no player: nobody took a seat, and the host heard of no one.
    expect(host.socket.last("peer:joined")).toBeUndefined();
    expect((await backend.store.get(code))?.seats.every((seat) => seat === null)).toBe(true);
  });

  it("says not found alike for a wrong token and a missing room, and counts no miss", async () => {
    const { code } = await openRoom();
    const results = [];
    for (let i = 0; i < 45; i++) {
      const checker = await probe(i % 2 ? code : "ZZZZ", "x".repeat(24));
      results.push(checker.socket.last("probe:result"));
      expect(checker.socket.closedWith).toBe(1000);
    }
    expect(new Set(results.map((result) => JSON.stringify(result)))).toEqual(new Set([JSON.stringify({ type: "probe:result", nonce: NONCE, ok: false, reason: "not-found" })]));
    // A phone from the same address can still join.
    const phone = connect();
    await phone.send({ type: "phone:join", code });
    expect(phone.socket.last("phone:joined")).toBeDefined();
  });

  it("reports a moved or ended room", async () => {
    const moved = await openRoom();
    await moved.host.send({ type: "host:retire", code: moved.code, token: moved.token, movedTo: "WXYZ" });
    expect((await probe(moved.code, moved.token)).socket.last("probe:result")?.reason).toBe("moved");
    const ended = await openRoom();
    await ended.host.send({ type: "host:retire", code: ended.code, token: ended.token });
    expect((await probe(ended.code, ended.token)).socket.last("probe:result")?.reason).toBe("closed");
  });

  it("says no host at once when nobody listens on the room", async () => {
    const { host, code, token } = await openRoom();
    await host.drop();
    expect((await probe(code, token)).socket.last("probe:result")?.reason).toBe("no-host");
  });

  it("gives up on a host that never answers", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { code, token } = await openRoom();
    const checker = await probe(code, token);
    expect(checker.socket.last("probe:result")).toBeUndefined();
    vi.advanceTimersByTime(ECHO_WAIT_MS + 1);
    expect(checker.socket.last("probe:result")?.reason).toBe("no-echo");
    expect(checker.socket.closedWith).toBe(1000);
  });

  it("finds nothing on a server instance that does not share the room store", async () => {
    const { host, code, token } = await openRoom();
    answerChecks(host);
    const elsewhere = memoryBackend();
    expect((await probe(code, token, elsewhere)).socket.last("probe:result")?.reason).toBe("not-found");
  });

  it("ignores an echo from a connection that hosts nothing", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { code, token } = await openRoom();
    const checker = await probe(code, token);
    const stranger = connect();
    await stranger.send({ type: "host:echo", nonce: NONCE });
    expect(checker.socket.last("probe:result")).toBeUndefined();
    vi.advanceTimersByTime(ECHO_WAIT_MS + 1);
    expect(checker.socket.last("probe:result")?.ok).toBe(false);
  });
});
