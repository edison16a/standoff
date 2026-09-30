import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../engine/events";
import { ofType } from "../engine/test-helpers";
import { CEREMONY_AT, cycleToFight, CYCLE_S, JUMP_AT, speedAt } from "./timeline";
import { KNOCKDOWNS, Trailer } from "./trailer";

/** Plays the film as the showcase does, a 1/60 s step at a time, noting the loop time of each event. */
function play(until = CYCLE_S): { at: number; event: MatchEvent }[] {
  const trailer = new Trailer();
  const seen: { at: number; event: MatchEvent }[] = [];
  for (let step = 1; step <= until * 60; step++) {
    const at = step / 60;
    for (const event of trailer.advanceTo(at)) seen.push({ at, event });
  }
  return seen;
}

describe("the showcase trailer", () => {
  const seen = play();
  const events = seen.map((s) => s.event);
  const downs = seen.filter((s) => s.event.type === "knockdown");

  it("plays a block, a slip, a counter, a duck and a body shot", () => {
    expect(ofType(events, "block").length).toBeGreaterThanOrEqual(1);
    expect(ofType(events, "miss").map((m) => m.dodge)).toEqual(expect.arrayContaining(["slip", "duck"]));
    expect(ofType(events, "hit").some((h) => h.counter)).toBe(true);
    expect(ofType(events, "hit").some((h) => h.level === "body")).toBe(true);
  });

  it("drops the blue corner twice, and he beats the count between them", () => {
    expect(downs.map((d) => d.event)).toEqual([
      expect.objectContaining({ fighter: 1, knockdowns: 1 }),
      expect.objectContaining({ fighter: 1, knockdowns: KNOCKDOWNS }),
    ]);
    expect(ofType(events, "resume")).toHaveLength(1);
  });

  it("shows the first fall before the cut over the count, and the fight back on after it", () => {
    const first = downs[0]!.at;
    // The fall takes a little over a second.
    expect(JUMP_AT - first).toBeGreaterThan(1);
    const resumed = seen.find((s) => s.event.type === "resume")!.at;
    expect(resumed).toBe(Math.ceil(JUMP_AT * 60) / 60);
  });

  it("lands the knockout blow inside the slow motion", () => {
    expect(speedAt(downs[1]!.at)).toBeLessThan(0.5);
  });

  it("lets the knockout fall play out before the cut to the belt", () => {
    const fallS = cycleToFight(CEREMONY_AT) - cycleToFight(downs[1]!.at);
    expect(fallS).toBeGreaterThan(1);
  });
});
