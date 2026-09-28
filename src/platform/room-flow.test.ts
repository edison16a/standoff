// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostRoom } from "./host/host-room";
import { useHostStore } from "./host/host-store";
import { PhoneRoom } from "./phone/phone-room";
import type { Backend } from "./relay/backend";
import { MemoryBus } from "./relay/memory/memory-bus";
import { MemoryStore } from "./relay/memory/memory-store";
import { parseEnvelope } from "./relay/parse-envelope";
import { RelayConnection } from "./relay/relay-connection";

vi.mock("@/platform/audio/audio-engine", () => ({
  AudioEngine: class {
    unlocked = true;
    async unlock() {}
    close() {}
  },
}));

let backend: Backend;

/**
 * A browser WebSocket wired straight to a real relay connection, so the
 * real host and phone rooms play through the real seat rules end to end.
 */
class LinkedSocket {
  readyState = 0;
  bufferedAmount = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  private readonly relay: RelayConnection;

  constructor() {
    const ctx = { backend, joinUrlFor: (code: string) => `https://x/join/${code}`, now: Date.now, client: "test", sharedRooms: true, deadline: null };
    this.relay = new RelayConnection({ send: (data) => this.deliver(data), close: (code) => this.close(code) }, ctx);
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.();
    });
  }
  send(data: string) {
    const envelope = parseEnvelope(data);
    if (envelope) this.relay.receive(envelope);
  }
  close(code = 1000) {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.relay.disconnect();
    this.onclose?.({ code });
  }
  private deliver(data: string) {
    setTimeout(() => this.readyState === 1 && this.onmessage?.({ data }));
  }
}

/** Lets every socket open, every relay step run and every reply land. */
async function settle() {
  for (let i = 0; i < 20; i++) await new Promise((resolve) => setTimeout(resolve));
}

async function hostGame(host: HostRoom) {
  await host.create("blade-clash", 2);
  await settle();
  return useHostStore.getState().room!.code;
}

async function phoneJoins(code: string, name: string | null) {
  const phone = new PhoneRoom(code);
  await phone.join(name);
  await settle();
  return phone;
}

describe("a whole room, host and phones over the real relay", () => {
  let host: HostRoom;

  beforeEach(async () => {
    backend = { store: new MemoryStore(), bus: new MemoryBus(), label: "test", shared: true };
    vi.stubGlobal("WebSocket", LinkedSocket);
    sessionStorage.clear();
    host = new HostRoom();
    host.connect();
    await settle();
  });
  afterEach(() => {
    // Leaving forgets the room, so the next test's host does not try to resume it.
    host.leave();
    host.dispose();
    vi.unstubAllGlobals();
  });

  it("hosts a second game without a reload, and a phone joins it", async () => {
    const first = await hostGame(host);
    const early = await phoneJoins(first, "Ann");
    expect(early.store.getState().stage).toBe("playing");
    host.leave();
    await settle();
    expect(early.store.getState().error).toBe("closed");
    const second = await hostGame(host);
    expect(second).not.toBe(first);
    const phone = await phoneJoins(second, "Ann");
    expect(phone.store.getState()).toMatchObject({ stage: "playing", seat: 1, name: "Ann", error: null });
    expect(useHostStore.getState().players[0]).toMatchObject({ name: "Ann", connected: true });
  });

  it("refuses a duplicate name and restores a reloaded phone to its seat", async () => {
    const code = await hostGame(host);
    const ann = await phoneJoins(code, "Ann");
    const copy = await phoneJoins(code, "ANN");
    expect(copy.store.getState()).toMatchObject({ stage: "name", clash: { reason: "name-taken" } });
    await phoneJoins(code, "Bob");
    const events: string[] = [];
    host.api!.on((event) => event.type === "joined" && events.push(`${event.seat}:${event.rejoined}`));
    // A reload: the page goes, and the new one opens at the player's own address.
    ann.dispose();
    await settle();
    expect(useHostStore.getState().players[0]?.connected).toBe(false);
    const reloaded = new PhoneRoom(code, "Ann");
    reloaded.resume();
    await settle();
    expect(reloaded.store.getState()).toMatchObject({ stage: "playing", seat: 1, name: "Ann" });
    expect(events).toEqual(["1:true"]);
    expect(useHostStore.getState().players.map((p) => [p.name, p.connected])).toEqual([["Ann", true], ["Bob", true]]);
  });

  it("offers a dropped player's name as a reconnect to a new tab", async () => {
    const code = await hostGame(host);
    const ann = await phoneJoins(code, "Ann");
    ann.dispose();
    await settle();
    // A new tab on another phone: no seat token in storage or in the page.
    sessionStorage.clear();
    vi.resetModules();
    const { PhoneRoom: NewTab } = await import("./phone/phone-room");
    const tab = new NewTab(code);
    await tab.join("ann");
    await settle();
    expect(tab.store.getState().clash).toEqual({ reason: "name-away", name: "ann" });
    await tab.join("ann", true);
    await settle();
    expect(tab.store.getState()).toMatchObject({ stage: "playing", seat: 1, name: "Ann" });
  });
});
