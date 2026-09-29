import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HostRoomEvent } from "@/platform/games/game-api";
import { answerChecks, clearHostPage, created, FakeSocket, resetHostPage, tick as harnessTick, TOKEN } from "@/platform/testing/host-harness";
import { HostRoom } from "./host-room";
import { useHostStore } from "./host-store";

// Hosting a room unlocks sound, which a test has no speakers for.
vi.mock("@/platform/audio/audio-engine", () => ({
  AudioEngine: class {
    unlocked = true;
    async unlock() {}
    close() {}
  },
}));

const tick = harnessTick;

let host: HostRoom;

async function openRoom() {
  host = new HostRoom();
  host.connect();
  await tick();
  const socket = FakeSocket.all[0]!;
  await host.create("blade-clash", 2);
  socket.receive(created("ABCD"));
  const events: HostRoomEvent[] = [];
  host.api!.on((event) => events.push(event));
  return { socket, events };
}

describe("HostRoom", () => {
  beforeEach(resetHostPage);
  afterEach(() => {
    host.dispose();
    clearHostPage();
  });

  it("hides the code until the room passes its check", async () => {
    await openRoom();
    expect(useHostStore.getState()).toMatchObject({ screen: "room", health: "checking", opening: false });
    expect(useHostStore.getState().players.map((player) => player.name)).toEqual(["Player 1", "Player 2"]);
    await tick();
    answerChecks(true);
    await tick();
    expect(useHostStore.getState().health).toBe("ok");
  });

  it("sends one create however many times Host Game is pressed", async () => {
    host = new HostRoom();
    host.connect();
    await tick();
    await Promise.all([host.create("blade-clash", 2), host.create("blade-clash", 2)]);
    await host.create("blade-clash", 2);
    expect(FakeSocket.all[0]!.said("host:create")).toHaveLength(1);
    expect(useHostStore.getState().opening).toBe(true);
  });

  it("answers the relay's room check from its own socket", async () => {
    const { socket } = await openRoom();
    socket.receive({ type: "room:probe", nonce: "n".repeat(20) });
    expect(socket.sent).toContainEqual({ type: "host:echo", nonce: "n".repeat(20) });
  });

  it("names a player from their phone and keeps that message from the game", async () => {
    const { socket, events } = await openRoom();
    socket.receive({ type: "peer:joined", seat: 1, rejoined: false, name: "Player 1" });
    socket.receive({ type: "peer:message", seat: 1, payload: { kind: "profile", name: "Edison" } });
    socket.receive({ type: "peer:message", seat: 1, payload: { kind: "pick", characterId: "vale" } });
    expect(useHostStore.getState().players[0]).toEqual({ seat: 1, name: "Edison", connected: true });
    expect(events.filter((event) => event.type === "message")).toEqual([{ type: "message", seat: 1, payload: { kind: "pick", characterId: "vale" } }]);
    expect(socket.sent).toContainEqual({ type: "host:send", to: "all", payload: expect.objectContaining({ kind: "players" }) });
  });

  it("regenerates on a fresh connection and moves the phones once the new room passes", async () => {
    const { socket } = await openRoom();
    socket.receive({ type: "peer:joined", seat: 1, rejoined: false, name: "Ann" });
    const before = host.api;
    host.regenerate();
    expect(useHostStore.getState().health).toBe("fixing");
    await tick();
    const fresh = FakeSocket.all.find((s) => s.said("host:create").length > 0 && s !== socket)!;
    fresh.receive(created("WXYZ", "u".repeat(20)));
    await tick();
    // The old room is untouched until the new one passes its check.
    expect(useHostStore.getState().room?.code).toBe("ABCD");
    answerChecks(true);
    await tick();
    expect(useHostStore.getState()).toMatchObject({ room: { code: "WXYZ" }, health: "ok" });
    expect(host.api === before).toBe(false);
    expect(socket.sent).toContainEqual({ type: "host:retire", code: "ABCD", token: TOKEN, movedTo: "WXYZ" });
    expect(fresh.sent).toContainEqual({ type: "host:retire", code: "ABCD", token: TOKEN, movedTo: "WXYZ" });
  });

  it("makes a new room by itself when the room is lost before anyone joined", async () => {
    vi.useFakeTimers();
    const { socket } = await openRoom();
    socket.close(1006);
    await vi.advanceTimersByTimeAsync(500);
    // Every fresh socket's resume is refused, so the room is lost.
    for (let i = 0; i < 8 && useHostStore.getState().health !== "fixing"; i++) {
      FakeSocket.all.at(-1)!.receive({ type: "room:error", reason: "not-found" });
      await vi.advanceTimersByTimeAsync(3500);
    }
    expect(useHostStore.getState().health).toBe("fixing");
    vi.useRealTimers();
  });

  it("asks the big screen before remaking a lost room with players in it", async () => {
    vi.useFakeTimers();
    const { socket } = await openRoom();
    socket.receive({ type: "peer:joined", seat: 1, rejoined: false, name: "Ann" });
    socket.close(1006);
    await vi.advanceTimersByTimeAsync(500);
    for (let i = 0; i < 8 && useHostStore.getState().health !== "lost"; i++) {
      FakeSocket.all.at(-1)!.receive({ type: "room:error", reason: "not-found" });
      await vi.advanceTimersByTimeAsync(3500);
    }
    expect(useHostStore.getState()).toMatchObject({ health: "lost", problem: "lost", roomGone: true, screen: "room" });
    vi.useRealTimers();
  });

  it("ends a room it never asked for", async () => {
    const { socket } = await openRoom();
    socket.receive(created("QQQQ", "q".repeat(20)));
    expect(socket.sent).toContainEqual({ type: "host:retire", code: "QQQQ", token: "q".repeat(20) });
    expect(useHostStore.getState().room?.code).toBe("ABCD");
  });

  it("opens a second room after leaving the first, with nothing of the first left over", async () => {
    const { socket } = await openRoom();
    socket.receive({ type: "peer:joined", seat: 1, rejoined: false, name: "Ann" });
    host.leave();
    expect(socket.sent).toContainEqual({ type: "host:retire", code: "ABCD", token: TOKEN });
    expect(useHostStore.getState()).toMatchObject({ screen: "home", room: null, players: [], health: "idle" });
    await host.create("blade-clash", 2);
    expect(socket.sent.at(-1)).toEqual({ type: "host:create", game: "blade-clash", seats: 2 });
    socket.receive(created("WXYZ", "u".repeat(20)));
    expect(host.api?.code).toBe("WXYZ");
    expect(useHostStore.getState().players.map((player) => player.name)).toEqual(["Player 1", "Player 2"]);
  });

  it("keeps a game left over from the last room away from the next one", async () => {
    const { socket } = await openRoom();
    const stale = host.api!;
    host.leave();
    await host.create("blade-clash", 2);
    socket.receive(created("WXYZ", "u".repeat(20)));
    const sent = socket.sent.length;
    stale.send("all", { kind: "late" });
    stale.setPlaying(true);
    stale.leave();
    expect(socket.sent).toHaveLength(sent);
    expect(useHostStore.getState()).toMatchObject({ screen: "room", playing: false, room: { code: "WXYZ" } });
  });
});
