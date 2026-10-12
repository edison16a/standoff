import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SeatTimers } from "./seat-timers";

describe("booked gun sounds", () => {
  let clock = 0;
  const timers = () => new SeatTimers(() => clock);

  beforeEach(() => {
    vi.useFakeTimers();
    clock = 0;
  });
  afterEach(() => vi.useRealTimers());

  /** Moves the audio clock and the timers on together. */
  const advance = (seconds: number) => {
    clock += seconds;
    vi.advanceTimersByTime(seconds * 1000);
  };

  it("play at their exact audio time, handed over just before it", () => {
    const t = timers();
    const played: number[] = [];
    t.book(0, "reload", 1, (at) => played.push(at));
    advance(0.8);
    expect(played).toEqual([]);
    advance(0.15);
    expect(played).toEqual([1]);
  });

  it("play at once when already due", () => {
    const played: number[] = [];
    timers().book(0, "reload", 0.05, (at) => played.push(at));
    expect(played).toEqual([0.05]);
  });

  it("call off one seat's reload, leaving its pump cycle and the other seats alone", () => {
    const t = timers();
    const played: string[] = [];
    t.book(0, "reload", 1, () => played.push("seat 0 shell"));
    t.book(0, "cycle", 0.5, () => played.push("seat 0 pump"));
    t.book(1, "reload", 1, () => played.push("seat 1 shell"));
    t.cancel(0, "reload");
    advance(2);
    expect(played.sort()).toEqual(["seat 0 pump", "seat 1 shell"]);
  });

  it("clear everything for a new stage", () => {
    const t = timers();
    const played: number[] = [];
    t.book(0, "reload", 1, (at) => played.push(at));
    t.book(2, "cycle", 1, (at) => played.push(at));
    t.clear();
    advance(2);
    expect(played).toEqual([]);
  });
});
