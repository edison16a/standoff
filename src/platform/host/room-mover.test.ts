import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import { FOLLOW_AFTER_LEFT_MS, FOLLOW_GAP_MS, RoomMover } from "./room-mover";

let rotations: number;
let shared: boolean;
const mover = () => new RoomMover({ rotate: () => (rotations += 1) > 0, shared: () => shared, now: Date.now });
const resumed = (extra: Partial<Extract<ServerEnvelope, { type: "room:resumed" }>>): ServerEnvelope => ({
  type: "room:resumed",
  code: "ABCD",
  game: "g",
  seats: 2,
  joinUrl: "",
  connected: [false, false],
  names: [null, null],
  sharedRooms: false,
  ...extra,
});

describe("RoomMover", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    rotations = 0;
    shared = false;
  });
  afterEach(() => vi.useRealTimers());

  it("follows new connections at most once in a while", () => {
    const m = mover();
    m.follow();
    m.follow();
    expect(rotations).toBe(1);
    vi.advanceTimersByTime(FOLLOW_GAP_MS);
    m.follow();
    expect(rotations).toBe(2);
  });

  it("looks for a dropped phone only if it stays away, and never where rooms are shared", () => {
    const m = mover();
    m.left(1);
    m.back(1);
    vi.advanceTimersByTime(FOLLOW_AFTER_LEFT_MS);
    expect(rotations).toBe(0);
    m.left(1);
    vi.advanceTimersByTime(FOLLOW_AFTER_LEFT_MS);
    expect(rotations).toBe(1);
    shared = true;
    vi.advanceTimersByTime(FOLLOW_GAP_MS);
    m.left(2);
    vi.advanceTimersByTime(FOLLOW_AFTER_LEFT_MS);
    expect(rotations).toBe(1);
  });

  it("tells the old instance to let go only when the room moved to another", () => {
    const m = mover();
    const said: ClientEnvelope[] = [];
    const send = (message: ClientEnvelope) => said.push(message);
    m.handedOver(resumed({ instance: "a" }), "a", "t".repeat(20), send);
    m.handedOver(resumed({ instance: "b", sharedRooms: true }), "a", "t".repeat(20), send);
    expect(said).toEqual([]);
    m.handedOver(resumed({ instance: "b" }), "a", "t".repeat(20), send);
    m.handedOver(resumed({ restored: true }), null, "t".repeat(20), send);
    expect(said).toEqual([
      { type: "host:migrate", code: "ABCD", token: "t".repeat(20) },
      { type: "host:migrate", code: "ABCD", token: "t".repeat(20) },
    ]);
  });
});
