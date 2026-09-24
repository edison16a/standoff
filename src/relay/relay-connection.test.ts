import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientEnvelope, ServerEnvelope } from "@/shared/protocol";
import type { Backend } from "./backend";
import { MemoryBus } from "./memory/memory-bus";
import { MemoryStore } from "./memory/memory-store";
import { RelayConnection } from "./relay-connection";
import { HOST_GRACE_MS, SEAT_GRACE_MS } from "./room-state";

/** A socket that remembers what it was sent and whether it was closed. */
class FakeSocket {
  readonly inbox: ServerEnvelope[] = [];
  closedWith: number | null = null;
  send(data: string) {
    this.inbox.push(JSON.parse(data) as ServerEnvelope);
  }
  close(code = 1000) {
    this.closedWith = code;
  }
  last<T extends ServerEnvelope["type"]>(type: T): Extract<ServerEnvelope, { type: T }> {
    const found = [...this.inbox].reverse().find((m) => m.type === type);
    if (!found) throw new Error(`no ${type} message in ${JSON.stringify(this.inbox)}`);
    return found as Extract<ServerEnvelope, { type: T }>;
  }
  has(type: ServerEnvelope["type"]) {
    return this.inbox.some((m) => m.type === type);
  }
}

let backend: Backend;
let clock = 0;

/** Lets queued handlers and microtask deliveries run to completion. */
async function flush() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

function connect() {
  const socket = new FakeSocket();
  const connection = new RelayConnection(socket, { backend, joinUrlFor: (code) => `https://game.test/join/${code}`, now: () => clock });
  const send = async (envelope: ClientEnvelope) => {
    connection.receive(envelope);
    await connection.settled();
    await flush();
  };
  const drop = async () => {
    connection.disconnect();
    await connection.settled();
    await flush();
  };
  return { socket, connection, send, drop };
}

async function openRoom() {
  const host = connect();
  await host.send({ type: "host:create" });
  const created = host.socket.last("room:created");
  return { host, code: created.code, token: created.token };
}

describe("RelayConnection over the memory backend", () => {
  beforeEach(() => {
    clock = 1_000_000;
    backend = { store: new MemoryStore(() => clock), bus: new MemoryBus(), label: "test" };
  });
  afterEach(() => vi.useRealTimers());

  it("creates a room with a join url built for the request", async () => {
    const { host, code } = await openRoom();
    expect(code).toMatch(/^[A-Z]{4}$/);
    expect(host.socket.last("room:created").joinUrl).toBe(`https://game.test/join/${code}`);
  });

  it("assigns slots by join order and refuses a third phone", async () => {
    const { host, code } = await openRoom();
    const [a, b, c] = [connect(), connect(), connect()];
    await a.send({ type: "phone:join", code });
    await b.send({ type: "phone:join", code });
    await c.send({ type: "phone:join", code });
    expect(a.socket.last("phone:joined").slot).toBe(1);
    expect(b.socket.last("phone:joined").slot).toBe(2);
    expect(c.socket.last("room:error").reason).toBe("full");
    expect(host.socket.inbox.filter((m) => m.type === "peer:joined")).toHaveLength(2);
  });

  it("relays messages both ways, to one phone or both", async () => {
    const { host, code } = await openRoom();
    const [a, b] = [connect(), connect()];
    await a.send({ type: "phone:join", code });
    await b.send({ type: "phone:join", code });
    await a.send({ type: "phone:send", payload: { kind: "strike", action: "jab" } });
    expect(host.socket.last("peer:message")).toEqual({ type: "peer:message", slot: 1, payload: { kind: "strike", action: "jab" } });
    await host.send({ type: "host:send", to: 2, payload: { kind: "recenter" } });
    expect(b.socket.last("host:message").payload).toEqual({ kind: "recenter" });
    expect(a.socket.has("host:message")).toBe(false);
    await host.send({ type: "host:send", to: "all", payload: { kind: "feedback", event: "scored" } });
    expect(a.socket.last("host:message").payload).toEqual({ kind: "feedback", event: "scored" });
  });

  it("keeps a phone's frames in the order it sent them", async () => {
    const { host, code } = await openRoom();
    const phone = connect();
    await phone.send({ type: "phone:join", code });
    for (let i = 0; i < 20; i++) phone.connection.receive({ type: "phone:send", payload: { kind: "motion", pitch: i / 100, yaw: 0, roll: 0, move: 0 } });
    await phone.connection.settled();
    await flush();
    const pitches = host.socket.inbox.flatMap((m) => (m.type === "peer:message" && m.payload.kind === "motion" ? [m.payload.pitch] : []));
    expect(pitches).toEqual(Array.from({ length: 20 }, (_, i) => i / 100));
  });

  it("ignores host messages from a phone and phone messages from the host", async () => {
    const { host, code } = await openRoom();
    const [a, b] = [connect(), connect()];
    await a.send({ type: "phone:join", code });
    await b.send({ type: "phone:join", code });
    await a.send({ type: "host:send", to: 2, payload: { kind: "recenter" } });
    await host.send({ type: "phone:send", payload: { kind: "skip" } });
    expect(b.socket.has("host:message")).toBe(false);
    expect(host.socket.has("peer:message")).toBe(false);
  });

  it("gives a reconnecting phone its seat back and kicks the old socket", async () => {
    const { host, code } = await openRoom();
    const first = connect();
    await first.send({ type: "phone:join", code });
    const { token } = first.socket.last("phone:joined");
    const again = connect();
    await again.send({ type: "phone:join", code, token });
    expect(again.socket.last("phone:joined").slot).toBe(1);
    expect(first.socket.closedWith).toBe(4000);
    expect(host.socket.last("peer:joined").rejoined).toBe(true);
    // The old socket closing afterwards must not mark the seat as away.
    await first.drop();
    expect(host.socket.has("peer:left")).toBe(false);
  });

  it("frees a seat once its phone has been gone past the grace period", async () => {
    const { host, code } = await openRoom();
    const gone = connect();
    await gone.send({ type: "phone:join", code });
    await gone.drop();
    expect(host.socket.last("peer:left").slot).toBe(1);
    clock += SEAT_GRACE_MS + 1;
    const next = connect();
    await next.send({ type: "phone:join", code });
    expect(next.socket.last("phone:joined").slot).toBe(1);
  });

  it("holds the room through a host reload", async () => {
    const { host, code, token } = await openRoom();
    const phone = connect();
    await phone.send({ type: "phone:join", code });
    await host.drop();
    expect(phone.socket.has("host:away")).toBe(true);
    const reloaded = connect();
    await reloaded.send({ type: "host:resume", code, token });
    expect(reloaded.socket.last("room:resumed").connected).toEqual([true, false]);
    expect(phone.socket.has("host:back")).toBe(true);
  });

  it("closes the room when the host never returns", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { host, code } = await openRoom();
    const phone = connect();
    await phone.send({ type: "phone:join", code });
    await host.drop();
    clock += HOST_GRACE_MS + 2000;
    vi.advanceTimersByTime(HOST_GRACE_MS + 2000);
    await phone.connection.settled();
    await flush();
    expect(phone.socket.has("room:closed")).toBe(true);
    expect(await backend.store.get(code)).toBeNull();
  });

  it("rejects a resume with the wrong token and a join to a missing room", async () => {
    const { code } = await openRoom();
    const intruder = connect();
    await intruder.send({ type: "host:resume", code, token: "x".repeat(24) });
    expect(intruder.socket.last("room:error").reason).toBe("not-found");
    const lost = connect();
    await lost.send({ type: "phone:join", code: "ZZZZ" });
    expect(lost.socket.last("room:error").reason).toBe("not-found");
  });

  it("closes the room for everyone when the host ends the game", async () => {
    const { host, code } = await openRoom();
    const phone = connect();
    await phone.send({ type: "phone:join", code });
    await phone.send({ type: "host:close" });
    expect(await backend.store.get(code)).not.toBeNull();
    await host.send({ type: "host:close" });
    expect(phone.socket.has("room:closed")).toBe(true);
    expect(await backend.store.get(code)).toBeNull();
  });
});
