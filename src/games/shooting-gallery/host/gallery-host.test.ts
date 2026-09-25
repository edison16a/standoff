import { describe, expect, it, vi } from "vitest";
import type { HostRoomApi, HostRoomEvent, Player } from "@/platform/games/game-api";
import type { Payload, Seat } from "@/platform/protocol";
import { GalleryHost } from "./gallery-host";

// The session's sound needs Web Audio, which tests do not have.
vi.mock("../audio/gallery-audio", () => ({
  GalleryAudio: class {
    sfx = new Proxy({}, { get: () => () => {} });
    phase() {}
    shot() {}
    count() {}
    final() {}
    landed() {}
    setMusic() {}
    dispose() {}
  },
}));

/** A room with phones already seated, that records what the game sends. */
function fakeRoom(names: string[]) {
  const players: Player[] = names.map((name, i) => ({ seat: i + 1, name, connected: true }));
  const listeners = new Set<(event: HostRoomEvent) => void>();
  const sent: { to: Seat | "all"; payload: Payload }[] = [];
  const room: HostRoomApi = {
    code: "TEST",
    seats: 4,
    audio: {} as HostRoomApi["audio"],
    players: () => players,
    on: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    send: (to, payload) => sent.push({ to, payload }),
    setPlaying: () => {},
    leave: () => {},
  };
  const emit = (event: HostRoomEvent) => [...listeners].forEach((listener) => listener(event));
  const phone = (seat: Seat, payload: Payload) => emit({ type: "message", seat, payload });
  return { room, players, sent, emit, phone };
}

/** Walks a phone through calibration and the gun page to the Ready page. */
function setUp(phone: (seat: Seat, payload: Payload) => void, seat: Seat, ready: boolean) {
  phone(seat, { kind: "setup", step: "ready" });
  if (ready) phone(seat, { kind: "ready", ready: true });
}

describe("gallery host", () => {
  it("does not resend everyone's state for every aim message", () => {
    const { room, sent, phone } = fakeRoom(["Ann"]);
    const session = new GalleryHost(room);
    setUp(phone, 1, false);
    const before = sent.filter((s) => s.payload.kind === "state").length;
    for (let i = 0; i < 30; i++) phone(1, { kind: "aim", x: i / 100, y: 0 });
    expect(sent.filter((s) => s.payload.kind === "state").length).toBe(before);
    session.dispose();
  });

  it("starts the round when the one player not ready leaves", () => {
    const { room, players, emit, phone } = fakeRoom(["Ann", "Bob"]);
    const session = new GalleryHost(room);
    setUp(phone, 1, true);
    setUp(phone, 2, false);
    expect(session.phase()).toBe("lobby");
    players[1]!.connected = false;
    emit({ type: "left", seat: 2 });
    expect(session.phase()).toBe("countdown");
    expect(session.round().seats).toEqual([1]);
    session.dispose();
  });
});
