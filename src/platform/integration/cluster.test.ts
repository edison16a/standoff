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

type Store = typeof import("@/platform/host/host-store").useHostStore;
let cluster: FakeCluster;
let host: HostRoom;
let store: Store;
const phones: PhoneRoom[] = [];

/** Moves the clock on, letting every socket, relay step and timer run. */
const run = (ms: number) => vi.advanceTimersByTimeAsync(ms);
const state = () => store.getState();

/** The host's page: fresh modules, so nothing is left from another test. */
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

/** A phone's own page, with its own modules and storage, joining under a name. */
async function openPhone(code: string, name: string) {
  sessionStorage.clear();
  vi.resetModules();
  const { PhoneRoom } = await import("@/platform/phone/phone-room");
  const phone = new PhoneRoom(code);
  phones.push(phone);
  await phone.join(name);
  // Seated before the next page opens, since the pages share one session storage here.
  await run(500);
  return phone;
}

async function hostGame(): Promise<string> {
  await host.create("tiny", 4);
  await run(1000);
  expect(state().health, JSON.stringify({ creates: cluster.counts, status: state().status, screen: state().screen })).toBe("ok");
  return state().room!.code;
}

describe("rooms across server instances", () => {
  afterEach(() => {
    for (const phone of phones.splice(0)) phone.dispose();
    host.dispose();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  for (const webSockets of [true, false]) {
    it(`hosts game after game in one tab, ${webSockets ? "over WebSockets" : "over the stream fallback"}`, async () => {
      await openHost({ instances: 1, routing: "first", webSockets });
      for (let cycle = 0; cycle < 10; cycle++) {
        const code = await hostGame();
        const seated = [await openPhone(code, "Ann"), await openPhone(code, "Bob")];
        await run(1000);
        expect(seated.map((p) => p.store.getState().error ?? p.store.getState().stage)).toEqual(["playing", "playing"]);
        expect(state().players.filter((p) => p.connected)).toHaveLength(2);
        host.leave();
        await run(1000);
        expect(seated.map((p) => p.store.getState().error)).toEqual(["closed", "closed"]);
      }
      expect(cluster.counts.creates).toBe(10);
      expect(cluster.counts.post410).toBe(0);
    });
  }

  it("regenerates a room and brings its players along by name", async () => {
    await openHost({ instances: 1, routing: "first" });
    const code = await hostGame();
    const seated = [await openPhone(code, "Ann"), await openPhone(code, "Bob")];
    host.regenerate();
    await run(5000);
    expect(state()).toMatchObject({ health: "ok" });
    const next = state().room!.code;
    expect(next).not.toBe(code);
    // Each phone is told the new code. Its page then joins it under the same name (see PhoneApp).
    expect(seated.map((p) => p.store.getState().movedTo)).toEqual([next, next]);
    for (const name of ["Ann", "Bob"]) await openPhone(next, name);
    await run(1000);
    expect(state().players.filter((p) => p.connected).map((p) => p.name)).toEqual(["Ann", "Bob"]);
    // The players are in the new room, so losing it asks the big screen first.
    cluster.deploy();
    await run(30_000);
    expect(state()).toMatchObject({ health: "lost", problem: "lost" });
  });

  it("makes a new room by itself when a deploy takes the room before anyone joined", async () => {
    await openHost({ instances: 1, routing: "first" });
    const code = await hostGame();
    cluster.deploy();
    await run(30_000);
    expect(state()).toMatchObject({ screen: "room", health: "ok" });
    expect(state().room!.code).not.toBe(code);
  });

  it("asks the big screen when a deploy takes a room with players, and tells the phones plainly", async () => {
    await openHost({ instances: 1, routing: "first" });
    const code = await hostGame();
    const ann = await openPhone(code, "Ann");
    await run(1000);
    cluster.deploy();
    // Known within seconds, with the dead code hidden meanwhile.
    await run(1500);
    expect(state().health).not.toBe("ok");
    await run(10_500);
    expect(state()).toMatchObject({ health: "lost", problem: "lost", roomGone: true });
    await run(18_000);
    expect(cluster.counts.creates).toBe(1);
    expect(ann.store.getState()).toMatchObject({ stage: "error", error: "lost" });
    host.regenerate();
    await run(10_000);
    expect(state().health).toBe("ok");
    expect(state().room!.code).not.toBe(code);
  });

  it("never loops or leaves the room screen when every request lands on another instance", async () => {
    await openHost({ instances: 3, routing: "roundRobin", webSockets: false });
    await host.create("tiny", 4);
    await run(5 * 60_000);
    // Each check may land where the room is not, but the host never loops:
    // the first create and its retries, then at most three new rooms in five minutes.
    expect(state().screen).toBe("room");
    expect(["ok", "lost", "checking"]).toContain(state().health);
    expect(cluster.counts.creates).toBeLessThanOrEqual(3 + 3 * 3);
  });
});
