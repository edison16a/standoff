import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CandidateResult } from "./room-candidate";
import type { OpenedRoom } from "./room-keeper";
import { LIMIT_WAIT_MS, RemakeBudget, RoomRemaker, type Candidate } from "./room-remake";

const OLD = { code: "ABCD", token: "t".repeat(20), game: "tiny", seats: 2 };
const room = (code: string): OpenedRoom => ({ code, token: "u".repeat(20), game: "tiny", seats: 2, joinUrl: "", sharedRooms: true, connected: null, names: null });

class FakeCandidate implements Candidate {
  discarded = false;
  constructor(private readonly result: CandidateResult) {}
  start() {
    return Promise.resolve(this.result);
  }
  discard() {
    this.discarded = true;
  }
}

let results: CandidateResult[];
let made: FakeCandidate[];
let swaps: string[];
let gaveUp: number;

function remaker() {
  return new RoomRemaker<FakeCandidate>({
    make: () => {
      const candidate = new FakeCandidate(results.shift() ?? { ok: false, reason: "timeout" });
      made.push(candidate);
      return candidate;
    },
    swap: (_candidate, next) => swaps.push(next.code),
    giveUp: () => (gaveUp += 1),
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: Date.now,
  });
}

describe("RoomRemaker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    results = [];
    made = [];
    swaps = [];
    gaveUp = 0;
  });
  afterEach(() => vi.useRealTimers());

  it("swaps to a candidate only once it passed, and leaves nothing else behind", async () => {
    results = [{ ok: false, reason: "not-found" }, { ok: true, room: room("WXYZ") }];
    const remake = remaker();
    expect(remake.start("auto", OLD)).toBe(true);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(swaps).toEqual(["WXYZ"]);
    expect(made.map((c) => c.discarded)).toEqual([true, false]);
    expect(remake.busy).toBe(false);
  });

  it("gives up after three automatic tries, and a click gets a fresh budget", async () => {
    const remake = remaker();
    remake.start("auto", OLD);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(made).toHaveLength(3);
    expect(gaveUp).toBe(1);
    expect(remake.start("auto", OLD)).toBe(false);
    expect(remake.start("manual", OLD)).toBe(true);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(made).toHaveLength(6);
  });

  it("waits out the server's minute once when it refuses for making too many rooms", async () => {
    results = [{ ok: false, reason: "limit" }, { ok: true, room: room("WXYZ") }];
    remaker().start("manual", OLD);
    await vi.advanceTimersByTimeAsync(LIMIT_WAIT_MS - 1);
    expect(swaps).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(swaps).toEqual(["WXYZ"]);
  });

  it("ends the candidate under way when cancelled", async () => {
    const remake = remaker();
    remake.start("manual", OLD);
    remake.cancel();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(swaps).toEqual([]);
    expect(made.every((c) => c.discarded)).toBe(true);
  });
});

describe("RemakeBudget", () => {
  it("allows three tries in five minutes, spaced out", () => {
    let now = 0;
    const budget = new RemakeBudget(() => now);
    expect([budget.take(), budget.take(), budget.take(), budget.take()]).toEqual([0, 2000, 6000, null]);
    now = 5 * 60_000 + 1;
    expect(budget.take()).toBe(0);
  });
});
