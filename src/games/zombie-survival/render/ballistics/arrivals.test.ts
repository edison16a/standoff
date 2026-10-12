import { describe, expect, it } from "vitest";
import { ArrivalQueue } from "./arrivals";
import { ShotLedger } from "./shot-ledger";

describe("the arrival queue", () => {
  it("holds a hit until its round arrives, then hands it over once", () => {
    const queue = new ArrivalQueue<string>();
    queue.push(7, 0.03, "chest");
    const seen: string[] = [];
    queue.due(0.02, (_, v) => seen.push(v));
    expect(seen).toEqual([]);
    queue.due(0.031, (_, v) => seen.push(v));
    queue.due(0.05, (_, v) => seen.push(v));
    expect(seen).toEqual(["chest"]);
    expect(queue.size).toBe(0);
  });

  it("hands over hits in the order they arrive, whatever order they were fired", () => {
    const queue = new ArrivalQueue<string>();
    queue.push(1, 0.05, "pellet");
    queue.push(2, 0.02, "rifle");
    const seen: string[] = [];
    queue.due(0.1, (key, v) => seen.push(`${key}:${v}`));
    expect(seen).toEqual(["2:rifle", "1:pellet"]);
  });

  it("forgets a zombie's hits once it is gone", () => {
    const queue = new ArrivalQueue<number>();
    queue.push(3, 0.01, 1);
    queue.push(4, 0.01, 2);
    queue.drop(3);
    const seen: number[] = [];
    queue.due(1, (key) => seen.push(key));
    expect(seen).toEqual([4]);
  });
});

describe("the shot ledger", () => {
  it("lets each hit event claim one bullet for its seat and zombie, oldest first", () => {
    const ledger = new ShotLedger<string>();
    ledger.record(1, 9, 0, "pellet a");
    ledger.record(2, 9, 0, "other seat");
    ledger.record(1, 9, 0, "pellet b");
    expect(ledger.take(1, 9)).toBe("pellet a");
    expect(ledger.take(1, 9)).toBe("pellet b");
    expect(ledger.take(1, 9)).toBeUndefined();
    expect(ledger.take(2, 9)).toBe("other seat");
  });

  it("drops bullets no event ever claimed", () => {
    const ledger = new ShotLedger<string>();
    ledger.record(1, 5, 0, "into a body already dead");
    ledger.record(1, 6, 2, "fresh");
    expect(ledger.size).toBe(1);
    expect(ledger.take(1, 5)).toBeUndefined();
  });
});
