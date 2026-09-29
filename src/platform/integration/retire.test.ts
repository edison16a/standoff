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
 * The host ends the game just as its connection drops, and its next one
 * lands on an instance that has never heard of the room. That instance's
 * "not found" once counted as done, and the phones sat on "The host is
 * reconnecting" until the room was called lost half a minute later.
 */
type Store = typeof import("@/platform/host/host-store").useHostStore;
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

type Socket = { close(code: number): void };
type Reachable = { connection: { link: { part: { client: { current: Socket } } } } };

describe("ending a game from another instance", () => {
  afterEach(() => {
    for (const phone of phones.splice(0)) phone.dispose();
    host.dispose();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  for (const webSockets of [true, false]) {
    it(`still tells the phones, ${webSockets ? "over WebSockets" : "over the stream"}`, async () => {
      vi.useFakeTimers();
      vi.resetModules();
      sessionStorage.clear();
      const cluster = new FakeCluster({ instances: 1, routing: "first", webSockets });
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
      const a = cluster.backends[0]!;
      cluster.switch();
      const b = cluster.backends[0]!;
      // The host's next connection lands on B, the ones after it on A again.
      let first = true;
      (cluster as unknown as { pick(): Backend }).pick = () => (first ? ((first = false), b) : a);
      // The host's connection drops, and it leaves before it is back.
      (host as unknown as Reachable).connection.link.part.client.current.close(1006);
      await run(0);
      host.leave();
      await run(10_000);
      expect(seated.map((phone) => phone.store.getState().error)).toEqual(["closed", "closed"]);
    });
  }
});
