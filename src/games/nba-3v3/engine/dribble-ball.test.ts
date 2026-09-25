import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../roster";
import { charOf } from "./athlete";
import { dribbleRate, LEG_SHARE, strideLength } from "./dribble-ball";
import type { MatchEvent } from "./events";
import { Match, type Entry } from "./match";
import { gainPossession } from "./rules";
import { STEP } from "./tuning";

const ENTRIES: Entry[] = CHARACTER_IDS.slice(0, 6).map((character, i) => ({ team: (i % 2) as 0 | 1, character, seat: i === 0 ? 1 : null }));

/** Player 0 on a phone with the ball at the top facing the rim, everyone else far off and still. */
function setup(): Match {
  const m = new Match({ entries: ENTRIES, seed: 3, firstOffence: 0 });
  while (m.phase !== "live") m.step(STEP);
  m.athletes.forEach((a, i) => Object.assign(a, { x: -6 + i * 2.4, z: 10.8, vx: 0, vz: 0, y: 0, auto: false, move: { x: 0, z: 0 }, action: { kind: "none" } }));
  Object.assign(m.athletes[0]!, { x: 0, z: 8, yaw: Math.PI, dribbleHand: 1, dribbleSide: 1, dribble: 0.05, pocket: 0 });
  m.ball.holder = 0;
  m.ball.mode = "held";
  m.drainEvents();
  return m;
}

function run(m: Match, seconds: number, events: MatchEvent[] = [], each?: () => void): MatchEvent[] {
  for (let t = 0; t < seconds; t += STEP) {
    m.step(STEP);
    each?.();
    events.push(...m.drainEvents());
  }
  return events;
}

describe("the dribble rhythm", () => {
  it("bounces once a stride on the run and pounds quicker and lower standing still", () => {
    const m = setup();
    const a = m.athletes[0]!;
    const leg = LEG_SHARE * charOf(a).build.height;
    expect(dribbleRate(a, 5)).toBeCloseTo(5 / strideLength(5, leg, false), 5);
    expect(dribbleRate(a, 0)).toBeGreaterThan(dribbleRate(a, 1.2));
    let top = 0;
    run(m, 1, [], () => (top = Math.max(top, m.ball.pos.y)));
    expect(top).toBeLessThan(charOf(a).build.height * 0.42);
  });

  it("holds a caught ball in the pocket a moment before the first bounce", () => {
    const m = setup();
    const a = m.athletes[1]!;
    gainPossession(m, a);
    const early = run(m, 0.18);
    expect(early.some((e) => e.type === "bounce")).toBe(false);
    expect(m.ball.pos.y).toBeGreaterThan(charOf(a).build.height * 0.55);
    expect(run(m, 0.5).some((e) => e.type === "bounce")).toBe(true);
  });

  it("pulls the ball round in the hand through a spin and puts it back down after", () => {
    const m = setup();
    const a = m.athletes[0]!;
    m.press(0, "defend", { x: 0, z: -1 });
    let carried = 0;
    run(m, 0.56, [], () => (carried += a.pocket > 0 ? STEP : 0));
    expect(carried).toBeGreaterThan(0.2);
    expect(run(m, 0.6).some((e) => e.type === "bounce")).toBe(true);
  });

  it("waits for the ball to come back up before taking it across", () => {
    const m = setup();
    const a = m.athletes[0]!;
    a.dribble = 0.6;
    m.press(0, "defend", { x: -1, z: 0 });
    m.step(STEP);
    expect(a.dribbleSide).toBe(1);
    let middle = false;
    run(m, 0.6, [], () => (middle ||= Math.abs(a.dribbleSide) < 0.2));
    expect(middle).toBe(true);
    expect(a.dribbleSide).toBe(-1);
  });
});
