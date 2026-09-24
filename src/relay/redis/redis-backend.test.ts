import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ServerEnvelope } from "@/shared/protocol";
import type { Backend } from "../backend";
import { RelayConnection } from "../relay-connection";
import { createRedisBackend } from "./redis-backend";

/**
 * Runs the relay against a real Redis, with the host and the phones on two
 * separate backends. Two backends means two sets of connections, exactly
 * like two Vercel function instances, so this proves messages and seats
 * really cross instances. Set REDIS_TEST_URL to run it.
 */
const url = process.env.REDIS_TEST_URL;

class FakeSocket {
  readonly inbox: ServerEnvelope[] = [];
  closedWith: number | null = null;
  send(data: string) {
    this.inbox.push(JSON.parse(data) as ServerEnvelope);
  }
  close(code = 1000) {
    this.closedWith = code;
  }
  async waitFor<T extends ServerEnvelope["type"]>(type: T): Promise<Extract<ServerEnvelope, { type: T }>> {
    for (let i = 0; i < 100; i++) {
      const found = [...this.inbox].reverse().find((m) => m.type === type);
      if (found) return found as Extract<ServerEnvelope, { type: T }>;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`no ${type} in ${JSON.stringify(this.inbox)}`);
  }
}

describe.skipIf(!url)("Relay over Redis across two instances", () => {
  let instanceA: Backend;
  let instanceB: Backend;
  const connect = (backend: Backend) => {
    const socket = new FakeSocket();
    const connection = new RelayConnection(socket, { backend, joinUrlFor: (code) => `https://x.test/join/${code}`, now: Date.now });
    return { socket, connection };
  };

  beforeAll(async () => {
    instanceA = await createRedisBackend(url!);
    instanceB = await createRedisBackend(url!);
  });

  afterAll(async () => {
    for (const backend of [instanceA, instanceB]) await backend.close?.();
  });

  it("joins, relays and reclaims seats across instances", async () => {
    const host = connect(instanceA);
    host.connection.receive({ type: "host:create" });
    const { code } = await host.socket.waitFor("room:created");

    const p1 = connect(instanceB);
    const p2 = connect(instanceA);
    p1.connection.receive({ type: "phone:join", code });
    const { slot: s1, token } = await p1.socket.waitFor("phone:joined");
    p2.connection.receive({ type: "phone:join", code });
    const { slot: s2 } = await p2.socket.waitFor("phone:joined");
    expect([s1, s2]).toEqual([1, 2]);

    p1.connection.receive({ type: "phone:send", payload: { kind: "strike", action: "parry" } });
    expect((await host.socket.waitFor("peer:message")).payload).toEqual({ kind: "strike", action: "parry" });

    host.connection.receive({ type: "host:send", to: 1, payload: { kind: "recenter" } });
    expect((await p1.socket.waitFor("host:message")).payload).toEqual({ kind: "recenter" });

    // The same phone reloads and lands on the other instance.
    const again = connect(instanceA);
    again.connection.receive({ type: "phone:join", code, token });
    expect((await again.socket.waitFor("phone:joined")).slot).toBe(1);
    for (let i = 0; i < 50 && p1.socket.closedWith === null; i++) await new Promise((r) => setTimeout(r, 20));
    expect(p1.socket.closedWith).toBe(4000);

    host.connection.receive({ type: "host:close" });
    await again.socket.waitFor("room:closed");
    expect(await instanceB.store.get(code)).toBeNull();
  });
});
