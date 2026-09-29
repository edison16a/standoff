import { beforeEach, describe, expect, it } from "vitest";
import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import type { Backend } from "./backend";
import { MemoryBus } from "./memory/memory-bus";
import { MemoryStore } from "./memory/memory-store";
import { RelayConnection } from "./relay-connection";

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
}

let backend: Backend;
const clock = 1_000_000;

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
  const drop = async () => {
    connection.disconnect();
    await connection.settled();
    await flush();
  };
  return { socket, send, drop };
}

async function openRoom(host = connect()) {
  await host.send({ type: "host:create", game: "blade-clash", seats: 3 });
  return { host, code: host.socket.last("room:created").code };
}

describe("RelayConnection names", () => {
  beforeEach(() => {
    backend = { store: new MemoryStore(() => clock), bus: new MemoryBus(), label: "test", shared: true };
  });

  it("keeps names unique in a room, and a clash is no wrong guess", async () => {
    const { host, code } = await openRoom();
    const ann = connect();
    await ann.send({ type: "phone:join", code, name: "Ann" });
    expect(host.socket.last("peer:joined")).toMatchObject({ seat: 1, name: "Ann" });
    const copy = connect();
    // Far more tries than the wrong guess cap, which must not close the socket.
    for (let i = 0; i < 25; i++) await copy.send({ type: "phone:join", code, name: " aNN " });
    expect(copy.socket.last("room:error").reason).toBe("name-taken");
    expect(copy.socket.closedWith).toBeNull();
    await copy.send({ type: "phone:join", code, name: "Bob" });
    expect(copy.socket.last("phone:joined")).toMatchObject({ seat: 2, name: "Bob" });
  });

  it("gives a dropped player's seat back by name, as the same player", async () => {
    const { host, code } = await openRoom();
    const ann = connect();
    await ann.send({ type: "phone:join", code, name: "Ann" });
    await ann.drop();
    const stranger = connect();
    await stranger.send({ type: "phone:join", code, name: "ann" });
    expect(stranger.socket.last("room:error").reason).toBe("name-away");
    const back = connect();
    await back.send({ type: "phone:join", code, name: "ann", reconnect: true });
    expect(back.socket.last("phone:joined")).toMatchObject({ seat: 1, name: "Ann" });
    expect(host.socket.last("peer:joined")).toEqual({ type: "peer:joined", seat: 1, rejoined: true, name: "Ann" });
  });

  it("tells a reloaded host every player's name", async () => {
    const { host, code } = await openRoom();
    const token = host.socket.last("room:created").token;
    await connect().send({ type: "phone:join", code, name: "Ann" });
    await connect().send({ type: "phone:join", code });
    await host.drop();
    const reloaded = connect();
    await reloaded.send({ type: "host:resume", code, token });
    expect(reloaded.socket.last("room:resumed").names).toEqual(["Ann", "Player 2", null]);
  });

  it("hosts a second room on the same connection and phones can join it", async () => {
    const { host, code: first } = await openRoom();
    await connect().send({ type: "phone:join", code: first, name: "Ann" });
    await host.send({ type: "host:close" });
    const { code: second } = await openRoom(host);
    expect(second).not.toBe(first);
    const phone = connect();
    await phone.send({ type: "phone:join", code: second, name: "Ann" });
    expect(phone.socket.last("phone:joined")).toMatchObject({ code: second, seat: 1, name: "Ann" });
    expect(host.socket.last("peer:joined")).toMatchObject({ seat: 1, name: "Ann" });
  });
});
