// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HostRoom } from "@/platform/host/host-room";
import type { PhoneRoom } from "@/platform/phone/phone-room";
import { FakeCluster, type ClusterOptions } from "@/platform/testing/fake-cluster";

vi.mock("@/platform/audio/audio-engine", () => ({
  AudioEngine: class {
    ctx = Object.assign(new EventTarget(), { state: "running", resume: async () => {} });
    unlocked = true;
    async unlock() {}
    close() {}
  },
}));

/**
 * Vercel without a store: rooms live in one instance's memory, sockets are
 * cut after five minutes, and at some point every new connection goes to
 * a fresh instance while the open ones stay put. A match must carry on.
 */
type Store = typeof import("@/platform/host/host-store").useHostStore;
let cluster: FakeCluster;
let host: HostRoom;
let store: Store;
const phones: PhoneRoom[] = [];
const run = (ms: number) => vi.advanceTimersByTimeAsync(ms);
const state = () => store.getState();
const LIFETIME_MS = 300_000;

async function openHost(options: ClusterOptions) {
  vi.useFakeTimers();
  vi.resetModules();
  sessionStorage.clear();
  cluster = new FakeCluster(options);
  for (const [name, value] of Object.entries(cluster.globals())) vi.stubGlobal(name, value);
  const { HostRoom } = await import("@/platform/host/host-room");
  store = (await import("@/platform/host/host-store")).useHostStore;
  host = new HostRoom();
  host.connect();
  await run(100);
}

async function openPhone(code: string, name: string) {
  sessionStorage.clear();
  vi.resetModules();
  const { PhoneRoom } = await import("@/platform/phone/phone-room");
  const phone = new PhoneRoom(code);
  phones.push(phone);
  await phone.join(name);
  await run(500);
  return phone;
}

/** A host broadcast reaches every phone, and each phone's message reaches the host. */
async function bothWays(seated: PhoneRoom[]): Promise<{ down: number; up: number }> {
  let up = 0;
  let down = 0;
  const off = host.api!.on((event) => event.type === "message" && event.payload.kind === "pong" && (up += 1));
  const offs = seated.map((phone) => phone.api!.on((event) => event.type === "message" && event.payload.kind === "ping" && (down += 1)));
  host.api!.send("all", { kind: "ping" });
  for (const phone of seated) phone.api!.send({ kind: "pong" });
  await run(1000);
  off();
  for (const stop of offs) stop();
  return { down, up };
}

describe("a match while Vercel moves new connections to a fresh instance", () => {
  afterEach(() => {
    for (const phone of phones.splice(0)) phone.dispose();
    host.dispose();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  for (const webSockets of [true, false]) {
    for (const switchAt of [35_000, 127_000, 250_000]) {
      it(`keeps a ten minute match with its code, ${webSockets ? "over WebSockets" : "over the stream"}, switching at ${switchAt / 1000} s`, async () => {
        await openHost({ instances: 1, routing: "first", webSockets, lifetimeMs: LIFETIME_MS });
        await host.create("tiny", 4);
        await run(1000);
        expect(state().health).toBe("ok");
        const code = state().room!.code;
        const seated = [await openPhone(code, "Ann"), await openPhone(code, "Bob")];
        store.setState({ playing: true });
        await run(switchAt - 2500);
        cluster.switch();
        for (let minute = 0; minute < 10; minute++) {
          await run(60_000);
          expect(state().room?.code).toBe(code);
        }
        expect(state()).toMatchObject({ screen: "room", health: "ok", status: "open" });
        expect(state().players.filter((p) => p.connected).map((p) => p.name)).toEqual(["Ann", "Bob"]);
        expect(seated.map((p) => p.store.getState().error ?? p.store.getState().stage)).toEqual(["playing", "playing"]);
        expect(await bothWays(seated)).toEqual({ down: 2, up: 2 });
        expect(cluster.counts.creates).toBe(1);
        expect(await cluster.newestHas(code)).toBe(true);
      });
    }
  }
});
