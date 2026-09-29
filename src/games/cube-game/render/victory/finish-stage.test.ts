import { describe, expect, it } from "vitest";
import { hop, standFor } from "./finish-stage";

describe("the finish celebration", () => {
  it("stands a player alone on a pedestal with a cup once they finish", () => {
    expect(standFor([{ slot: 1, place: 1, finished: true }])).toEqual({ kind: "pedestal", slots: [1], cup: true });
  });

  it("puts a race's winner on the top step with gold and the other second with silver", () => {
    const stand = standFor([
      { slot: 1, place: 2, finished: false },
      { slot: 2, place: 1, finished: true },
    ]);
    expect(stand).toEqual({
      kind: "podium",
      places: [
        { slot: 2, place: 1, cup: "gold" },
        { slot: 1, place: 2, cup: "silver" },
      ],
    });
  });

  it("gives no cups to a race nobody finished, ordered by how far each got", () => {
    const stand = standFor([
      { slot: 1, place: 1, finished: false },
      { slot: 2, place: 2, finished: false },
    ]);
    expect(stand.kind).toBe("podium");
    if (stand.kind === "podium") expect(stand.places.map((p) => [p.slot, p.cup])).toEqual([[1, null], [2, null]]);
  });

  it("shares one pedestal on a dead heat", () => {
    expect(standFor([
      { slot: 1, place: 1, finished: true },
      { slot: 2, place: 1, finished: true },
    ])).toEqual({ kind: "pedestal", slots: [1, 2], cup: true });
  });

  it("hops up and back down, landing flat after half a turn", () => {
    expect(hop(0).lift).toBe(0);
    const peak = hop(0.275);
    expect(peak.lift).toBeCloseTo(0.75);
    const landed = hop(1);
    expect(landed.lift).toBe(0);
    expect(landed.angle).toBeCloseTo(-Math.PI);
    // Every landing is a whole number of half turns, so a face is always down.
    for (let t = 0; t < 12; t += 0.37) {
      const { lift, angle } = hop(t);
      if (lift === 0) expect(Math.abs(angle / Math.PI - Math.round(angle / Math.PI))).toBeLessThan(1e-9);
    }
  });
});
