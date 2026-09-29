import { describe, expect, it } from "vitest";
import { headline } from "./headline";
import type { ResultRow } from "./store";

const row = (slot: number, place: number, finished: boolean, best = finished ? 100 : 40, attempts = 3): ResultRow => ({ slot, place, finished, best, attempts, jumps: 20 });

describe("the results' headline", () => {
  it("calls a finish alone a level complete, with the attempts", () => {
    expect(headline([row(1, 1, true, 100, 1)], null, "First Light")).toEqual({ eyebrow: "Level complete", slots: [1], subtitle: "First Light in 1 attempt" });
  });

  it("names a race's winner", () => {
    const h = headline([row(1, 2, false), row(2, 1, true, 100, 4)], 2, "Cloud Hopper");
    expect(h).toEqual({ eyebrow: "1v1 winner", slots: [2], subtitle: "First to the end of Cloud Hopper, 4 attempts" });
  });

  it("names both on a dead heat", () => {
    expect(headline([row(1, 1, true), row(2, 1, true)], null, "Core Meltdown").slots).toEqual([1, 2]);
  });

  it("names whoever got furthest when the race was ended early", () => {
    const h = headline([row(1, 2, false, 30), row(2, 1, false, 64)], null, "Circuit Rush");
    expect(h).toEqual({ eyebrow: "Round over", slots: [2], subtitle: "Got furthest on Circuit Rush, 64%" });
  });
});
