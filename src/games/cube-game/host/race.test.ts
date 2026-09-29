import { describe, expect, it } from "vitest";
import { finishText, graceLeft, ordinal, places, RACE_GRACE, verdict } from "./race";

describe("race places", () => {
  it("writes places the usual way", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]);
    expect(finishText("Player 2", 1)).toBe("Player 2 got 1st place!");
  });

  it("places players by when they crossed the line", () => {
    expect(places([null, null])).toEqual([null, null]);
    expect(places([40.2, null])).toEqual([1, null]);
    expect(places([40.2, 39.9])).toEqual([2, 1]);
  });

  it("gives a dead heat 1st to both", () => {
    expect(places([40.25, 40.25])).toEqual([1, 1]);
    expect(verdict([1, 1])).toEqual({ kind: "tie" });
  });

  it("names the winner, or nobody when no one finished", () => {
    expect(verdict([2, 1])).toEqual({ kind: "win", slot: 2 });
    expect(verdict([1, null])).toEqual({ kind: "win", slot: 1 });
    expect(verdict([null, null])).toEqual({ kind: "none" });
  });

  it("counts down the grace time from the first finish only", () => {
    expect(graceLeft([null, null], 50)).toBeNull();
    expect(graceLeft([null, 40], 50)).toBe(RACE_GRACE - 10);
    expect(graceLeft([45, 40], 50)).toBe(RACE_GRACE - 10);
    expect(graceLeft([null, 40], 400)).toBe(0);
  });
});
