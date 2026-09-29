import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { connectTo, memoryBackend, type Connected } from "@/platform/testing/relay-kit";
import type { Backend } from "./backend";
import { createRedisBackend } from "./redis/redis-backend";
import { TOMBSTONE_MS } from "./room-state";

let backend: Backend;
let clock = 0;
const connect = () => connectTo(backend, () => clock);

async function roomWithPhones(count = 2) {
  const host = connect();
  await host.send({ type: "host:create", game: "blade-clash", seats: 2 });
  const { code, token } = host.socket.last("room:created")!;
  const phones: Connected[] = [];
  for (let i = 0; i < count; i++) {
    const phone = connect();
    await phone.send({ type: "phone:join", code, name: `P${i}` });
    phones.push(phone);
  }
  return { host, phones, code, token };
}

describe("retiring a room by its token", () => {
  beforeEach(() => {
    clock = 1_000_000;
    backend = memoryBackend(() => clock);
  });

  it("moves the phones and kicks the old host, from another connection", async () => {
    const { host, phones, code, token } = await roomWithPhones();
    const fresh = connect();
    await fresh.send({ type: "host:create", game: "blade-clash", seats: 2 });
    const next = fresh.socket.last("room:created")!.code;
    await fresh.send({ type: "host:retire", code, token, movedTo: next });
    for (const phone of phones) expect(phone.socket.last("room:moved")).toEqual({ type: "room:moved", code: next });
    expect(host.socket.closedWith).toBe(4000);
    // The sender hosts the new room and is never kicked.
    expect(fresh.socket.closedWith).toBeNull();
    expect(fresh.socket.last("room:retired")).toEqual({ type: "room:retired", code, found: true });
  });

  it("answers a late join on the old code with the new one, and counts no miss", async () => {
    const { code, token, host } = await roomWithPhones(0);
    await host.send({ type: "host:retire", code, token, movedTo: "WXYZ" });
    const late = connect();
    for (let i = 0; i < 45; i++) await late.send({ type: "phone:join", code });
    expect(late.socket.last("room:moved")).toEqual({ type: "room:moved", code: "WXYZ" });
    expect(late.socket.closedWith).toBeNull();
  });

  it("leaves a closed tombstone without a new code, and a late join hears the game ended", async () => {
    const { host, phones, code, token } = await roomWithPhones();
    await host.send({ type: "host:retire", code, token });
    expect(phones[0]!.socket.last("room:closed")).toBeDefined();
    expect(await backend.store.get(code)).toMatchObject({ closed: true, movedTo: null, hostConn: null });
    const late = connect();
    await late.send({ type: "phone:join", code });
    expect(late.socket.last("room:error")?.reason).toBe("closed");
  });

  it("changes nothing for a wrong token", async () => {
    const { phones, code } = await roomWithPhones();
    const stranger = connect();
    await stranger.send({ type: "host:retire", code, token: "x".repeat(24), movedTo: "WXYZ" });
    expect(stranger.socket.last("room:retired")).toEqual({ type: "room:retired", code, found: false });
    expect(phones[0]!.socket.last("room:moved")).toBeUndefined();
    expect(await backend.store.get(code)).toMatchObject({ closed: false });
  });

  it("sends no second notice when the same retire comes again", async () => {
    const { host, phones, code, token } = await roomWithPhones();
    const other = connect();
    await host.send({ type: "host:retire", code, token, movedTo: "WXYZ" });
    await other.send({ type: "host:retire", code, token, movedTo: "WXYZ" });
    expect(phones[0]!.socket.count("room:moved")).toBe(1);
    expect(other.socket.last("room:retired")?.found).toBe(true);
  });

  it("forgets the code once the tombstone is old", async () => {
    const { host, code, token } = await roomWithPhones(0);
    await host.send({ type: "host:retire", code, token });
    clock += TOMBSTONE_MS + 1000;
    // The memory store sweeps on the next create.
    await connect().send({ type: "host:create", game: "blade-clash", seats: 2 });
    const late = connect();
    await late.send({ type: "phone:join", code });
    expect(late.socket.last("room:error")?.reason).toBe("not-found");
  });

  it("never tells the phones the host is away after it ended the room", async () => {
    const { host, phones, code, token } = await roomWithPhones();
    await host.send({ type: "host:retire", code, token });
    await host.drop();
    await phones[0]!.drop();
    expect(phones[1]!.socket.last("host:away")).toBeUndefined();
    expect(await backend.store.get(code)).toMatchObject({ closed: true });
  });

  it("still honours host:close and host:remake from older tabs", async () => {
    const { host, phones } = await roomWithPhones();
    await host.send({ type: "host:remake" });
    const next = host.socket.last("room:created")!.code;
    expect(phones[0]!.socket.last("room:moved")?.code).toBe(next);
    await host.send({ type: "host:close" });
    expect(await backend.store.get(next)).toMatchObject({ closed: true });
  });
});

const url = process.env.REDIS_TEST_URL;

describe.skipIf(!url)("tombstones in Redis", () => {
  const opened: Backend[] = [];
  afterAll(async () => {
    for (const each of opened) await each.close?.();
  });

  it("keeps an ended room for ten minutes, then lets it expire", async () => {
    const redis = await createRedisBackend(url!);
    opened.push(redis);
    backend = redis;
    const { host, code, token } = await roomWithPhones(0);
    await host.send({ type: "host:retire", code, token, movedTo: "WXYZ" });
    const late = connect();
    await late.send({ type: "phone:join", code });
    expect(late.socket.last("room:moved")?.code).toBe("WXYZ");
    const { Redis } = await import("ioredis");
    const raw = new Redis(url!);
    const ttl = await raw.ttl(`standoff:room:${code}`);
    await raw.quit();
    expect(ttl).toBeGreaterThan(TOMBSTONE_MS / 1000 - 30);
    expect(ttl).toBeLessThanOrEqual(TOMBSTONE_MS / 1000);
  });
});
