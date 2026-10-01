// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { PhoneRoomApi, PhoneRoomEvent } from "@/platform/games/game-api";
import type { GalleryPhase, GalleryState } from "../protocol";
import { GalleryPhone } from "./gallery-phone";

/** A room the test talks through as if it were the host. */
function fakeRoom() {
  let listener: ((event: PhoneRoomEvent) => void) | null = null;
  const room = {
    seat: 1,
    motion: "unavailable",
    audio: { bus: () => null, now: 0 },
    send: () => {},
    sendLossy: () => {},
    on: (next: (event: PhoneRoomEvent) => void) => {
      listener = next;
      return () => (listener = null);
    },
  } as unknown as PhoneRoomApi;
  const host = (payload: { kind: string; [key: string]: unknown }) => listener?.({ type: "message", payload });
  const reconnect = () => listener?.({ type: "rejoined" });
  return { room, host, reconnect };
}

function state(phase: GalleryPhase): GalleryState {
  const player = { seat: 1, name: "Ann", connected: true, step: "ready" as const, ready: false, inRound: true, score: 10, shots: 1, hits: 1, place: 1, best: null };
  return { kind: "state", phase, seconds: 20, timeLeft: 12, countdown: 0, players: [player], winners: [] };
}

describe("the gallery phone", () => {
  let phone: GalleryPhone | null = null;
  afterEach(() => phone?.dispose());

  it("keeps the flash of points for the round it was scored in", () => {
    const { room, host } = fakeRoom();
    phone = new GalleryPhone(room);
    host(state("playing"));
    host({ kind: "scored", points: 25, target: "duckling", bull: false });
    expect(phone.store.getState().scored?.points).toBe(25);
    host(state("playing"));
    expect(phone.store.getState().scored?.points).toBe(25);
    // The next round's pad must not open on the last round's points.
    host(state("results"));
    expect(phone.store.getState().scored).toBeNull();
    host(state("countdown"));
    expect(phone.store.getState().scored).toBeNull();
  });

  it("does not bring a ready from before the round back after a reconnect", () => {
    const { room, host, reconnect } = fakeRoom();
    const sent: { kind: string }[] = [];
    room.send = (payload) => void sent.push(payload as { kind: string });
    phone = new GalleryPhone(room);
    phone.setReady(true);
    // Dropped mid round: the round may have ended, and the host cleared everyone's ready, while it was away.
    host(state("playing"));
    sent.length = 0;
    reconnect();
    expect(sent.some((m) => m.kind === "ready")).toBe(false);
    // In the lobby a ready still stands, so it goes back.
    host({ ...state("lobby"), players: [{ ...state("lobby").players[0]!, ready: true }] });
    sent.length = 0;
    reconnect();
    expect(sent.some((m) => m.kind === "ready")).toBe(true);
  });
});
