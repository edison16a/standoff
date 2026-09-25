import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../engine/events";
import { ofType } from "../engine/test-helpers";
import { CYCLE_S, Trailer } from "./trailer";

describe("the showcase trailer", () => {
  it("plays a block, a slip, a counter, a duck and ends in a knockdown", () => {
    const trailer = new Trailer();
    const events: MatchEvent[] = [];
    for (let c = 0; c <= CYCLE_S; c += 1 / 30) events.push(...trailer.advanceTo(c));
    expect(ofType(events, "block").length).toBeGreaterThanOrEqual(1);
    expect(ofType(events, "miss").map((m) => m.dodge)).toEqual(expect.arrayContaining(["slip", "duck"]));
    expect(ofType(events, "hit").some((h) => h.stagger)).toBe(true);
    const down = ofType(events, "knockdown");
    expect(down).toHaveLength(1);
    expect(down[0]!.fighter).toBe(1);
  });

  it("lands the knockout blow inside the slow motion", () => {
    const trailer = new Trailer();
    let at = -1;
    for (let c = 0; c <= CYCLE_S && at < 0; c += 1 / 60) {
      if (ofType(trailer.advanceTo(c), "knockdown").length) at = c;
    }
    expect(Trailer.speed(at)).toBeLessThan(0.5);
  });
});
