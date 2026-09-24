import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { HostRoomEvent } from "@/platform/games/game-api";
import type { ServerEnvelope } from "@/platform/protocol";
import { HostRoom } from "./host-room";
import { useHostStore } from "./host-store";

/** Just enough of a browser WebSocket to drive the host by hand. */
class FakeSocket {
  static last: FakeSocket;
  readyState = 1;
  bufferedAmount = 0;
  readonly sent: unknown[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  constructor() {
    FakeSocket.last = this;
    queueMicrotask(() => this.onopen?.());
  }
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {}
  receive(message: ServerEnvelope) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

async function openRoom() {
  const host = new HostRoom();
  host.connect();
  await Promise.resolve();
  const socket = FakeSocket.last;
  socket.receive({ type: "room:created", code: "ABCD", game: "fencing", seats: 2, token: "t".repeat(20), joinUrl: "https://x/join/ABCD", sharedRooms: true });
  const events: HostRoomEvent[] = [];
  host.api!.on((event) => events.push(event));
  return { host, socket, events };
}

describe("HostRoom", () => {
  beforeEach(() => {
    Object.assign(globalThis, {
      WebSocket: FakeSocket,
      location: { protocol: "http:", host: "localhost" },
      window: { addEventListener() {}, removeEventListener() {} },
      localStorage: { getItem: () => null, setItem() {} },
      sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    });
  });
  afterEach(() => {
    for (const key of ["location", "window", "localStorage", "sessionStorage"]) Reflect.deleteProperty(globalThis, key);
  });

  it("opens the room screen with an empty seat per player", async () => {
    await openRoom();
    const state = useHostStore.getState();
    expect(state.screen).toBe("room");
    expect(state.players.map((player) => player.name)).toEqual(["Player 1", "Player 2"]);
  });

  it("names a player from their phone and keeps that message from the game", async () => {
    const { socket, events } = await openRoom();
    socket.receive({ type: "peer:joined", seat: 1, rejoined: false });
    socket.receive({ type: "peer:message", seat: 1, payload: { kind: "profile", name: "Edison" } });
    socket.receive({ type: "peer:message", seat: 1, payload: { kind: "pick", characterId: "vale" } });
    expect(useHostStore.getState().players[0]).toEqual({ seat: 1, name: "Edison", connected: true });
    expect(events.filter((event) => event.type === "message")).toEqual([{ type: "message", seat: 1, payload: { kind: "pick", characterId: "vale" } }]);
    // Every phone hears the new line up.
    expect(socket.sent).toContainEqual({ type: "host:send", to: "all", payload: expect.objectContaining({ kind: "players" }) });
  });
});
