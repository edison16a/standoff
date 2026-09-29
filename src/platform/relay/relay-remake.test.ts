import { beforeEach, describe, expect, it } from "vitest";
import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import type { Backend } from "./backend";
import { MemoryBus } from "./memory/memory-bus";
import { MemoryStore } from "./memory/memory-store";
import { RelayConnection } from "./relay-connection";
import { HOST_GRACE_MS } from "./room-state";

class FakeSocket {
  readonly inbox: ServerEnvelope[] = [];
  send(data: string) {
    this.inbox.push(JSON.parse(data) as ServerEnvelope);
  }
  close() {}
  last<T extends ServerEnvelope["type"]>(type: T): Extract<ServerEnvelope, { type: T }> | undefined {
    return [...this.inbox].reverse().find((m) => m.type === type) as Extract<ServerEnvelope, { type: T }> | undefined;
  }
}

let backend: Backend;
let clock = 0;

async function flush() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

function connect() {
  const socket = new FakeSocket();
  const connection = new RelayConnection(socket, { backend, joinUrlFor: (code) => `https://game.test/join/${code}`, now: () => clock, client: "test", sharedRooms: true, deadline: null });
  const send = async (envelope: ClientEnvelope) => {
    connection.receive(envelope);
    await connection.settled();
    await flush();
  };
  return { socket, send };
}

async function roomWithPhone() {
  const host = connect();
  await host.send({ type: "host:create", game: "magic-kart", seats: 3 });
  const code = host.socket.last("room:created")!.code;
  const phone = connect();
  await phone.send({ type: "phone:join", code });
  return { host, phone, code };
}

describe("remaking a lobby", () => {
  beforeEach(() => {
    clock = 1_000_000;
    backend = { store: new MemoryStore(() => clock), bus: new MemoryBus(), label: "test", shared: true };
  });

  it("opens a fresh room for the same game and moves the phones to it", async () => {
    const { host, phone, code } = await roomWithPhone();
    await host.send({ type: "host:remake" });
    const created = host.socket.last("room:created")!;
    expect(created.code).not.toBe(code);
    expect(created).toMatchObject({ game: "magic-kart", seats: 3 });
    expect(phone.socket.last("room:moved")).toEqual({ type: "room:moved", code: created.code });
    // Phones are moved, not told the game ended.
    expect(phone.socket.last("room:closed")).toBeUndefined();

    await phone.send({ type: "phone:join", code: created.code });
    expect(phone.socket.last("phone:joined")).toMatchObject({ code: created.code, seat: 1, hostHere: true });
    expect(host.socket.last("peer:joined")).toMatchObject({ seat: 1 });
  });

  it("closes the old room, and sends a phone that slept through the move on to the new one", async () => {
    const { host, code } = await roomWithPhone();
    await host.send({ type: "host:remake" });
    const next = host.socket.last("room:created")!.code;
    const late = connect();
    await late.send({ type: "phone:join", code });
    expect(late.socket.last("phone:joined")).toBeUndefined();
    expect(late.socket.last("room:moved")).toEqual({ type: "room:moved", code: next });
  });

  it("ignores a remake from anyone but the host", async () => {
    const { host, phone } = await roomWithPhone();
    await phone.send({ type: "host:remake" });
    expect(phone.socket.last("room:created")).toBeUndefined();
    expect(host.socket.inbox.filter((m) => m.type === "room:created")).toHaveLength(1);
  });

  it("says a room whose host is gone for good has closed, not that it was never there", async () => {
    const { code } = await roomWithPhone();
    const host = connect();
    await host.send({ type: "host:create", game: "magic-kart", seats: 2 });
    const other = host.socket.last("room:created")!.code;
    // The host of `other` drops and stays away past the grace period.
    const store = backend.store;
    await store.update(other, (room) => ({ room: { ...room, hostConn: null, hostAwaySince: clock }, result: true }));
    clock += HOST_GRACE_MS + 1;
    const late = connect();
    await late.send({ type: "phone:join", code: other });
    expect(late.socket.last("room:error")?.reason).toBe("closed");
    // A live room is unaffected however long it has run.
    const again = connect();
    await again.send({ type: "phone:join", code });
    expect(again.socket.last("phone:joined")).toBeDefined();
  });
});
