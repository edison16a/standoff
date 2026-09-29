import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerEnvelope } from "@/platform/protocol";
import { answerChecks, clearHostPage, created, FakeSocket, resetHostPage, tick } from "@/platform/testing/host-harness";
import { HostRoom } from "./host-room";
import { useHostStore } from "./host-store";
import { LOBBY_EVERY_MS } from "./room-watchdog";

vi.mock("@/platform/audio/audio-engine", () => ({
  AudioEngine: class {
    unlocked = true;
    async unlock() {}
    close() {}
  },
}));

const state = () => useHostStore.getState();
let host: HostRoom;

/** A room that passed its check. `shared` false is Vercel without a store; `instance` names the answering instance. */
async function openRoom({ shared = true, instance = "a" } = {}) {
  host = new HostRoom();
  host.connect();
  await tick();
  const socket = FakeSocket.all[0]!;
  await host.create("blade-clash", 2);
  socket.receive(created("ABCD", undefined, { sharedRooms: shared, instance }));
  await tick();
  answerChecks(true);
  await tick();
  expect(state().health).toBe("ok");
  return socket;
}

const resumed = (instance: string, extra = {}): ServerEnvelope => ({
  type: "room:resumed",
  code: "ABCD",
  game: "blade-clash",
  seats: 2,
  joinUrl: "",
  connected: [true, false],
  names: ["Ann", null],
  sharedRooms: false,
  instance,
  ...extra,
});

describe("HostRoom watching its room", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetHostPage();
  });
  afterEach(() => {
    host.dispose();
    clearHostPage();
    vi.useRealTimers();
  });

  it("hides the code while a resume is refused, and shows it again once the room is back", async () => {
    const socket = await openRoom();
    socket.close(1006);
    await vi.advanceTimersByTimeAsync(500);
    FakeSocket.all.at(-1)!.receive({ type: "room:error", reason: "not-found" });
    expect(state().health).toBe("checking");
    await vi.advanceTimersByTimeAsync(600);
    FakeSocket.all.at(-1)!.receive(resumed("a", { sharedRooms: true }));
    await tick();
    answerChecks(true);
    await vi.advanceTimersByTimeAsync(100);
    expect(state()).toMatchObject({ health: "ok", room: { code: "ABCD" } });
  });

  it("takes the new socket's status on a swap, so leaving after it leaves Host Game ready", async () => {
    const socket = await openRoom();
    socket.close(1006);
    expect(state().status).toBe("reconnecting");
    host.regenerate();
    await tick();
    const fresh = FakeSocket.all.find((s) => s !== socket && s.said("host:create").length > 0)!;
    fresh.receive(created("WXYZ", "u".repeat(20)));
    await tick();
    answerChecks(true);
    await vi.advanceTimersByTimeAsync(100);
    expect(state()).toMatchObject({ room: { code: "WXYZ" }, health: "ok", status: "open" });
    host.leave();
    expect(state()).toMatchObject({ screen: "home", status: "open", opening: false });
  });

  it("clears an alert about checks once a check passes, and a kept room is not asked about again", async () => {
    const socket = await openRoom();
    socket.receive({ type: "peer:joined", seat: 1, rejoined: false, name: "Ann" });
    await vi.advanceTimersByTimeAsync(LOBBY_EVERY_MS);
    answerChecks(false);
    await vi.advanceTimersByTimeAsync(100);
    expect(state()).toMatchObject({ health: "lost", problem: "unreachable" });
    await vi.advanceTimersByTimeAsync(LOBBY_EVERY_MS);
    answerChecks(true);
    await vi.advanceTimersByTimeAsync(100);
    expect(state()).toMatchObject({ health: "ok", problem: null });
    // It fails again, the player keeps the room, and failed checks alone do not ask a second time.
    await vi.advanceTimersByTimeAsync(LOBBY_EVERY_MS);
    answerChecks(false);
    await vi.advanceTimersByTimeAsync(100);
    host.keepRoom();
    expect(state().health).toBe("ok");
    await vi.advanceTimersByTimeAsync(LOBBY_EVERY_MS);
    answerChecks(false);
    await vi.advanceTimersByTimeAsync(100);
    expect(state().health).toBe("ok");
  });

  it("passes a check it answered itself, even when the answer reached the relay late", async () => {
    const socket = await openRoom();
    await vi.advanceTimersByTimeAsync(LOBBY_EVERY_MS);
    const probe = FakeSocket.all.at(-1)!;
    const [check] = probe.said("probe:room");
    socket.receive({ type: "room:probe", nonce: check!.nonce });
    probe.receive({ type: "probe:result", nonce: check!.nonce, ok: false, reason: "no-echo" });
    await vi.advanceTimersByTimeAsync(100);
    expect(state().health).toBe("ok");
    // No second look was needed.
    expect(FakeSocket.all.at(-1)).toBe(probe);
  });

  it("says the room is closing when its handovers are refused for good, with players in it", async () => {
    const socket = await openRoom();
    socket.receive({ type: "peer:joined", seat: 1, rejoined: false, name: "Ann" });
    socket.receive({ type: "server:rotate" });
    for (let attempt = 0; attempt < 3; attempt++) {
      await tick();
      FakeSocket.all.at(-1)!.receive({ type: "room:error", reason: "not-found" });
      await vi.advanceTimersByTimeAsync(3000);
    }
    expect(state()).toMatchObject({ health: "lost", problem: "ending" });
  });

  it("follows new connections to an instance without the room, and sends the old one's phones after it", async () => {
    const socket = await openRoom({ shared: false, instance: "a" });
    socket.receive({ type: "peer:joined", seat: 1, rejoined: false, name: "Ann" });
    await vi.advanceTimersByTimeAsync(LOBBY_EVERY_MS);
    answerChecks(false);
    await tick();
    // The check landed where the room is not, so the host moves its socket there.
    const next = FakeSocket.all.at(-1)!;
    expect(next.said("host:resume")).toEqual([{ type: "host:resume", code: "ABCD", token: "t".repeat(20), game: "blade-clash", seats: 2, names: ["Ann", null] }]);
    next.receive(resumed("b", { restored: true }));
    expect(socket.said("host:migrate")).toEqual([{ type: "host:migrate", code: "ABCD", token: "t".repeat(20) }]);
    expect(socket.readyState).toBe(3);
    expect(state()).toMatchObject({ room: { code: "ABCD" }, screen: "room" });
  });

  it("looks where new connections go when a phone drops and does not come back", async () => {
    const socket = await openRoom({ shared: false });
    socket.receive({ type: "peer:joined", seat: 1, rejoined: false, name: "Ann" });
    const count = FakeSocket.all.length;
    socket.receive({ type: "peer:left", seat: 1 });
    await vi.advanceTimersByTimeAsync(3000);
    expect(FakeSocket.all.length).toBe(count + 1);
    expect(FakeSocket.all.at(-1)!.said("host:resume")).toHaveLength(1);
  });

  it("stays put when a dropped phone comes back, or where rooms are shared", async () => {
    const socket = await openRoom({ shared: true });
    const count = FakeSocket.all.length;
    socket.receive({ type: "peer:left", seat: 1 });
    await vi.advanceTimersByTimeAsync(3000);
    expect(FakeSocket.all.length).toBe(count);
  });
});
