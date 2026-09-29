import { describe, expect, it } from "vitest";
import { racePlaces, raceWinner } from "./race";

describe("racePlaces", () => {
  it("puts the runner further along first", () => {
    expect(racePlaces([{ finishAt: null, x: 10 }, { finishAt: null, x: 30 }])).toEqual([2, 1]);
  });

  it("shares a place when level, as at the start", () => {
    expect(racePlaces([{ finishAt: null, x: 0 }, { finishAt: null, x: 0 }])).toEqual([1, 1]);
  });

  it("puts anyone over the line ahead of anyone still running", () => {
    expect(racePlaces([{ finishAt: null, x: 999 }, { finishAt: 40, x: 500 }])).toEqual([2, 1]);
  });

  it("ranks finishers by when they crossed", () => {
    expect(racePlaces([{ finishAt: 41.5, x: 500 }, { finishAt: 41.25, x: 500 }])).toEqual([2, 1]);
  });
});

describe("raceWinner", () => {
  it("has no winner until someone finishes", () => {
    expect(raceWinner([{ finishAt: null, x: 400 }, { finishAt: null, x: 10 }])).toBeNull();
  });

  it("names the first over the line, even if the other was ahead a moment ago", () => {
    expect(raceWinner([{ finishAt: null, x: 499 }, { finishAt: 30, x: 500 }])).toBe(2);
  });

  it("gives the earlier finisher the win when both crossed in one frame", () => {
    expect(raceWinner([{ finishAt: 30.004, x: 500 }, { finishAt: 30.008, x: 500 }])).toBe(1);
  });

  it("calls a dead heat no win", () => {
    expect(raceWinner([{ finishAt: 30, x: 500 }, { finishAt: 30, x: 500 }])).toBeNull();
  });
});
