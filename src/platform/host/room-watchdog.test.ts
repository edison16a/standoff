import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProbeOutcome } from "@/platform/net/room-probe";
import { LOBBY_EVERY_MS, RECHECK_MS, RoomWatchdog, SETTLED_AFTER_MS, SETTLED_EVERY_MS } from "./room-watchdog";

let answers: ProbeOutcome[];
let probes: number;
let broken: string[];
let passes: number;
let state: { phones: number; paused: boolean; online: boolean; shared: boolean };

function watchdog() {
  return new RoomWatchdog({
    probe: async () => {
      probes += 1;
      return answers.shift() ?? { ok: true };
    },
    passed: () => (passes += 1),
    broken: (_code, reason) => broken.push(reason),
    phonesConnected: () => state.phones,
    paused: () => state.paused,
    online: () => state.online,
    shared: () => state.shared,
    now: Date.now,
  });
}

const blip: ProbeOutcome = { ok: false, reason: "timeout" };
const missing: ProbeOutcome = { ok: false, reason: "not-found" };

describe("RoomWatchdog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    answers = [];
    probes = 0;
    broken = [];
    passes = 0;
    state = { phones: 0, paused: false, online: true, shared: true };
  });
  afterEach(() => vi.useRealTimers());

  it("checks at once, then every 20 s, then less often once the room has passed for a while", async () => {
    watchdog().watch("ABCD");
    await vi.advanceTimersByTimeAsync(0);
    expect(probes).toBe(1);
    await vi.advanceTimersByTimeAsync(LOBBY_EVERY_MS);
    expect(probes).toBe(2);
    await vi.advanceTimersByTimeAsync(SETTLED_AFTER_MS);
    const settled = probes;
    await vi.advanceTimersByTimeAsync(SETTLED_EVERY_MS);
    expect(probes).toBe(settled + 1);
    expect(broken).toEqual([]);
  });

  it("does not remake on one blip, but does on two in a row", async () => {
    answers = [blip, { ok: true }, blip, blip];
    watchdog().watch("ABCD");
    await vi.advanceTimersByTimeAsync(RECHECK_MS);
    expect(broken).toEqual([]);
    await vi.advanceTimersByTimeAsync(LOBBY_EVERY_MS + RECHECK_MS);
    expect(broken).toEqual(["timeout"]);
  });

  it("needs a third blip once phones are in", async () => {
    state.phones = 2;
    answers = [blip, blip, blip];
    watchdog().watch("ABCD");
    await vi.advanceTimersByTimeAsync(RECHECK_MS * 2 - 1);
    expect(broken).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(broken).toEqual(["timeout"]);
  });

  it("takes a missing room as final where rooms are shared, and as a blip where they are not", async () => {
    answers = [missing];
    watchdog().watch("ABCD");
    await vi.advanceTimersByTimeAsync(0);
    expect(broken).toEqual(["not-found"]);
    broken = [];
    state.shared = false;
    answers = [missing, { ok: true }];
    watchdog().watch("WXYZ");
    await vi.advanceTimersByTimeAsync(RECHECK_MS);
    expect(broken).toEqual([]);
  });

  it("waits while playing or offline, and counts a phone joining as a pass", async () => {
    state.paused = true;
    const dog = watchdog();
    dog.watch("ABCD");
    await vi.advanceTimersByTimeAsync(LOBBY_EVERY_MS * 3);
    expect(probes).toBe(0);
    state.paused = false;
    state.online = false;
    await vi.advanceTimersByTimeAsync(LOBBY_EVERY_MS);
    expect(probes).toBe(0);
    dog.passed();
    expect(passes).toBe(1);
  });

  it("ignores an answer about a room it has moved on from, and then checks the new one", async () => {
    let answer: (outcome: ProbeOutcome) => void = () => undefined;
    const asked: string[] = [];
    const dog = new RoomWatchdog({
      probe: (code) => {
        asked.push(code);
        return new Promise((resolve) => (answer = resolve));
      },
      passed: () => undefined,
      broken: (_code, reason) => broken.push(reason),
      phonesConnected: () => 0,
      paused: () => false,
      online: () => true,
      shared: () => true,
      now: Date.now,
    });
    dog.watch("ABCD");
    // A new room while the old room's check is still out.
    dog.watch("WXYZ");
    answer(missing);
    await vi.advanceTimersByTimeAsync(0);
    expect(broken).toEqual([]);
    expect(asked).toEqual(["ABCD", "WXYZ"]);
  });
});
