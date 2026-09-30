import { describe, expect, it } from "vitest";
import { stepMatch } from "../engine/match";
import { STEP } from "../engine/tuning";
import { COVER_STILL, makeCover } from "./cover";

/** Plays the staged cover to the icon's moment, as the lab director does. */
function playToStill() {
  const cover = makeCover();
  const hits: number[] = [];
  for (let t = 0; t < COVER_STILL.at; t += STEP) {
    stepMatch(cover.match, new Map([[0, cover.command(cover.match)]]));
    for (const e of cover.match.events) if (e.type === "hit" && e.attacker === 0 && e.target === 1) hits.push(t);
  }
  return { match: cover.match, hits };
}

describe("the icon's staged cover", () => {
  const { match, hits } = playToStill();
  const [karate, bear] = [match.fighters[0]!, match.fighters[1]!];

  it("lands the karate's uppercut on the bear before the still", () => {
    expect(hits.length).toBeGreaterThan(0);
    expect(karate.action).toBe("attack");
  });

  it("holds the bear flying high over the karate at the still", () => {
    expect(bear.pos.y).toBeGreaterThan(karate.pos.y + 1.5);
    expect(Math.abs(bear.pos.x - karate.pos.x)).toBeLessThan(1.5);
  });
});
