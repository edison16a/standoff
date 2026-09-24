import { describe, expect, it } from "vitest";
import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import type { Backend } from "./backend";
import { MemoryBus } from "./memory/memory-bus";
import { MemoryStore } from "./memory/memory-store";
import { RelayConnection } from "./relay-connection";

/** What goes wrong when the store fails, and what a client may not do too often. */

class FakeSocket {
  readonly inbox: ServerEnvelope[] = [];
  closedWith: number | null = null;
  send(data: string) {
    this.inbox.push(JSON.parse(data) as ServerEnvelope);
  }
  close(code = 1000) {
    this.closedWith = code;
  }
  get errors() {
    return this.inbox.flatMap((m) => (m.type === "room:error" ? [m.reason] : []));
  }
}

function connect(backend: Backend) {
  const socket = new FakeSocket();
  const connection = new RelayConnection(socket, {
    backend,
    joinUrlFor: (code) => `https://game.test/join/${code}`,
    now: Date.now,
    client: "203.0.113.9",
    sharedRooms: true,
    deadline: null,
  });
  const send = async (envelope: ClientEnvelope) => {
    connection.receive(envelope);
    await connection.settled();
    await new Promise((resolve) => setImmediate(resolve));
  };
  return { socket, send };
}

describe("relay failures and limits", () => {
  it("answers a join that fails in the store, and frees what it claimed", async () => {
    const store = new MemoryStore();
    const backend: Backend = { store, bus: new MemoryBus(), label: "test", shared: true };
    const host = connect(backend);
    await host.send({ type: "host:create", game: "fencing", seats: 2 });
    const code = host.socket.inbox.find((m) => m.type === "room:created")!.code;

    // The seat is claimed, then subscribing to its channel fails.
    const bus = new MemoryBus();
    bus.subscribe = () => Promise.reject(new Error("Redis is down"));
    const phone = connect({ ...backend, bus });
    await phone.send({ type: "phone:join", code });
    expect(phone.socket.errors).toEqual(["unavailable"]);

    const retry = connect(backend);
    await retry.send({ type: "phone:join", code });
    expect(retry.socket.inbox.find((m) => m.type === "phone:joined")?.seat).toBe(1);
  });

  it("stops one address from creating room after room", async () => {
    const backend: Backend = { store: new MemoryStore(), bus: new MemoryBus(), label: "test", shared: true };
    const host = connect(backend);
    for (let i = 0; i < 12; i++) await host.send({ type: "host:create", game: "fencing", seats: 2 });
    expect(host.socket.inbox.filter((m) => m.type === "room:created")).toHaveLength(10);
    expect(host.socket.errors).toEqual(["unavailable", "unavailable"]);
  });

  it("cuts off a connection that keeps guessing room codes", async () => {
    const backend: Backend = { store: new MemoryStore(), bus: new MemoryBus(), label: "test", shared: true };
    const guesser = connect(backend);
    for (let i = 0; i < 20; i++) await guesser.send({ type: "phone:join", code: "ZZZZ" });
    expect(guesser.socket.closedWith).toBeNull();
    await guesser.send({ type: "phone:join", code: "ZZZZ" });
    expect(guesser.socket.closedWith).toBe(1008);
  });
});
