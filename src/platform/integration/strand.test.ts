// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HostRoom } from "@/platform/host/host-room";
import type { PhoneRoom } from "@/platform/phone/phone-room";
import type { Backend } from "@/platform/relay/backend";
import { FakeCluster } from "@/platform/testing/fake-cluster";

vi.mock("@/platform/audio/audio-engine", () => ({
  AudioEngine: class {
    ctx = Object.assign(new EventTarget(), { state: "running", resume: async () => {} });
    unlocked = true;
    async unlock() {}
    close() {}
  },
}));

/**
 * The host follows its room to a fresh instance B, and then new
 * connections go back to the old instance A, as Vercel may route them
 * while two instances are warm. The old instance forgot the room and sent
 * the phones on, so their fresh sockets are refused there. Phones must not
 * be left silently on a socket whose instance no longer has the room, and
 * the host must see them seated wherever the room ends up.
 */
type Store = typeof import("@/platform/host/host-store").useHostStore;
let cluster: FakeCluster;
let host: HostRoom;
let store: Store;
const phones: PhoneRoom[] = [];
const run = (ms: number) => vi.advanceTimersByTimeAsync(ms);

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

async function bothWays(seated: PhoneRoom[]): Promise<{ down: number; up: number }> {
  let [up, down] = [0, 0];
  const off = host.api!.on((event) => event.type === "message" && event.payload.kind === "pong" && (up += 1));
  const offs = seated.map((phone) => phone.api!.on((event) => event.type === "message" && event.payload.kind === "ping" && (down += 1)));
  host.api!.send("all", { kind: "ping" });
  for (const phone of seated) phone.api!.send({ kind: "pong" });
  await run(1000);
  off();
  for (const stop of offs) stop();
  return { down, up };
}

describe("phones after the host moved instances and new connections went back", () => {
  afterEach(() => {
    for (const phone of phones.splice(0)) phone.dispose();
    host.dispose();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  for (const webSockets of [true, false]) {
    it(`are never stranded, and the host sees them seated, ${webSockets ? "over WebSockets" : "over the stream"}`, async () => {
      vi.useFakeTimers();
      vi.resetModules();
      sessionStorage.clear();
      cluster = new FakeCluster({ instances: 1, routing: "first", webSockets });
      for (const [name, value] of Object.entries(cluster.globals())) vi.stubGlobal(name, value);
      const { HostRoom } = await import("@/platform/host/host-room");
      store = (await import("@/platform/host/host-store")).useHostStore;
      host = new HostRoom();
      host.connect();
      await run(100);
      await host.create("tiny", 4);
      await run(1000);
      const code = store.getState().room!.code;
      const seated = [await openPhone(code, "Ann"), await openPhone(code, "Bob")];
      await run(1000);
      const a = cluster.backends[0]!;
      cluster.switch();
      const b = cluster.backends[0]!;
      // The host's next connection lands on B, and every one after it on A.
      let first = true;
      const routed = cluster as unknown as { pick(): Backend };
      routed.pick = () => (first ? ((first = false), b) : a);
      (host as unknown as { connection: { mover: { follow(): void } } }).connection.mover.follow();
      await run(60_000);
      const state = store.getState();
      expect(state.room?.code).toBe(code);
      expect(state.players.filter((player) => player.connected).map((player) => player.name)).toEqual(["Ann", "Bob"]);
      expect(seated.map((phone) => phone.store.getState().stage)).toEqual(["playing", "playing"]);
      expect(await bothWays(seated)).toEqual({ down: 2, up: 2 });
    });
  }
});
