import { describe, expect, it } from "vitest";
import { stepMatch } from "../engine/match";
import type { MatchEvent } from "../engine/events";
import { STEP } from "../engine/tuning";
import { planLength } from "./plan";
import { PLANS } from "./plans";
import { SEED, showcaseMatch } from "./script";

/** Plays the showcase match to `until` seconds and lists every event with its time. */
function play(until: number) {
  const m = showcaseMatch();
  const events: { t: number; e: MatchEvent }[] = [];
  while (m.frame * STEP < until && m.phase !== "over") {
    stepMatch(m);
    for (const e of m.events) events.push({ t: m.frame * STEP, e });
  }
  return { m, events };
}

const { events } = play(50);
const within = (from: number, to: number, type: MatchEvent["type"]) => events.filter(({ t, e }) => t >= from && t <= to && e.type === type);

// The media were filmed from this exact fight. An engine or bot change that moves it
// fails here, as a reminder to pick new moments and film the media again.
describe("showcase script", () => {
  it("films the dojo rooftop", () => {
    expect(showcaseMatch().stage.id).toBe("dojo-rooftop");
  });

  it("runs the loop exactly the eight seconds the capture tool records, cut on whole frames", () => {
    expect(planLength(PLANS.loop)).toBeCloseTo(8, 6);
    for (const shot of PLANS.loop.shots) expect(Math.abs(shot.length * 30 - Math.round(shot.length * 30))).toBeLessThan(1e-6);
  });

  it("lands a big hit, an ult or a KO in every shot of the trailer until the win", () => {
    const won = within(0, 50, "game")[0]!.t;
    for (const shot of PLANS.loop.shots) {
      if (shot.seed !== SEED || shot.from > won) continue;
      const to = shot.from + shot.length * (shot.rate ?? 1);
      const big = within(shot.from, to, "hit").filter(({ e }) => e.type === "hit" && e.heavy);
      const moments = big.length + within(shot.from, to, "ult").length + within(shot.from, to, "ko").length + within(shot.from, to, "game").length;
      expect(moments, `shot from ${shot.from}`).toBeGreaterThan(0);
    }
  });

  it("holds the bear's ult, the final KO and the samurai's win", () => {
    expect(within(25.9, 26.1, "ult").some(({ e }) => e.type === "ult" && e.id === 3)).toBe(true);
    expect(within(26.5, 26.6, "hit").length).toBeGreaterThanOrEqual(3);
    expect(within(46.5, 46.8, "game").some(({ e }) => e.type === "game" && e.winner === 1)).toBe(true);
  });
});
