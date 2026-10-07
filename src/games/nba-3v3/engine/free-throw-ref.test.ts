import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../builds";
import type { MatchEvent } from "./events";
import { callFoul } from "./foul-call";
import type { FreeThrowStage } from "./free-throw";
import { LINE } from "./free-throw-plan";
import { REF, refHands } from "./free-throw-ref";
import { Match, type Entry } from "./match";
import type { Outcome } from "./shot-model";
import { STEP } from "./tuning";
import { dist3 } from "./vec";

const ENTRIES: Entry[] = BUILD_IDS.slice(0, 6).map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: null }));

/** Two free throws for player 2 after a reach in, the first one ending as `first`. */
function firstShot(first: Outcome, phone = false): { m: Match; events: MatchEvent[]; stages: FreeThrowStage[]; held: number[]; bounces: number } {
  const entries = ENTRIES.map((e, i) => (phone && i === 2 ? { ...e, seat: 1 } : e));
  const m = new Match({ entries, seed: 4, firstOffence: 0 });
  while (m.phase !== "live") m.step(STEP);
  callFoul(m, m.athletes[1]!, m.athletes[2]!);
  m.forced = first;
  const events: MatchEvent[] = [];
  const stages: FreeThrowStage[] = [];
  const held: number[] = [];
  let bounces = 0;
  // Read through a function: the loop above narrowed the phase to live.
  const onLine = () => m.phase === "freeThrow";
  for (let t = 0; t < 20 && onLine() && !(m.freeThrows!.shot === 2 && m.freeThrows!.stage === "set"); t += STEP) {
    m.step(STEP);
    const ft = m.freeThrows!;
    if (stages.at(-1) !== ft.stage) stages.push(ft.stage);
    if (ft.official.holding) held.push(dist3(m.ball.pos, refHands(ft.official)));
    for (const e of m.drainEvents()) {
      events.push(e);
      if (e.type === "bounce" && ft.stage === "return") bounces++;
    }
  }
  return { m, events, stages, held, bounces };
}

describe("the referee between free throws", () => {
  it.each(["swish", "rimOut"] as const)("collects the ball after a %s, walks it up the lane and bounce passes it back", (first) => {
    const { m, stages, held, bounces, events } = firstShot(first);
    expect(stages).toEqual(["whistle", "walk", "set", "shooting", "result", "collect", "carry", "return", "set"]);
    // In his hands from the pick up to the pass, and it meets the floor once on the way.
    expect(held.length).toBeGreaterThan(20);
    expect(Math.max(...held.slice(20))).toBeLessThan(0.02);
    expect(bounces).toBe(1);
    expect(events.some((e) => e.type === "catch" && e.id === 2)).toBe(true);
    const ft = m.freeThrows!;
    expect(m.ball.holder).toBe(2);
    expect(ft.shot).toBe(2);
    // He let it go from up the lane, between the basket and the line.
    expect(ft.official.holding).toBe(false);
    expect(ft.official.z).toBeGreaterThan(REF.base.z + 1);
    expect(ft.official.z).toBeLessThan(LINE.z);
  });

  it("walks back to the baseline once the shooter has it, clear of the shot", () => {
    // A phone shooter takes his time, so nothing moves but the referee.
    const { m } = firstShot("swish", true);
    // The first shot was the phone's too: taken for it after the long wait.
    for (let t = 0; t < 2.2; t += STEP) m.step(STEP);
    const o = m.freeThrows!.official;
    expect(m.freeThrows!.stage).toBe("set");
    expect(Math.hypot(o.x - REF.base.x, o.z - REF.base.z)).toBeLessThan(0.3);
  });
});
