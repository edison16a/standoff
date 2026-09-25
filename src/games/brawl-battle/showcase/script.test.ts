import { describe, expect, it } from "vitest";
import { stepMatch } from "../engine/match";
import { STEP } from "../engine/tuning";
import { FILMED, LOOP_LEAD, PREROLL, showcaseMatch, STILL_AT } from "./script";

/** Plays the showcase match to `until` seconds and lists when each KO and hit happened. */
function play(until: number) {
  const m = showcaseMatch();
  const kos: number[] = [];
  const hits: number[] = [];
  for (let t = 0; t < until; t += STEP) {
    stepMatch(m);
    for (const e of m.events) {
      if (e.type === "ko") kos.push(m.frame * STEP);
      if (e.type === "hit") hits.push(m.frame * STEP);
    }
  }
  return { m, kos, hits };
}

// The media were filmed from this exact fight. An engine or bot change that moves it
// fails here, as a reminder to pick new moments and film the media again.
describe("showcase script", () => {
  it("films the dojo rooftop", () => {
    expect(showcaseMatch().stage.id).toBe("dojo-rooftop");
  });

  it("lands plenty of hits and KOs inside the loop, clear of the blended second", () => {
    const start = LOOP_LEAD + PREROLL;
    const { kos, hits } = play(start + FILMED);
    const inside = (times: number[]) => times.filter((t) => t > start + 1 && t < start + FILMED - 1);
    expect(inside(kos).length).toBeGreaterThanOrEqual(3);
    expect(inside(hits).length).toBeGreaterThanOrEqual(10);
  });

  it("holds the stills as a charged move is let go, with all four fighters in play", () => {
    const { m } = play(STILL_AT.poster);
    expect(m.fighters.some((f) => f.action === "attack" && f.charged > 0.5 && f.frame < 6)).toBe(true);
    expect(m.fighters.every((f) => f.action !== "out" && f.action !== "respawn" && f.action !== "dead")).toBe(true);
  });
});
