import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../builds";
import type { MatchEvent } from "./events";
import { JUKE, stun, wrongWay } from "./juke";
import { Match, type Entry } from "./match";
import { SHAKE_TIME } from "./shake";
import { STEP } from "./tuning";
import type { Action } from "./types";

type Move = Extract<Action, { kind: "move" }>;

const ENTRIES: Entry[] = BUILD_IDS.slice(0, 6).map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: i === 0 ? 1 : null }));

/** Player 0 with the ball at the top facing the rim, defender 1 a step in front. */
function setup(seed: number): Match {
  const m = new Match({ entries: ENTRIES, seed, firstOffence: 0 });
  while (m.phase !== "live") m.step(STEP);
  m.athletes.forEach((a, i) => Object.assign(a, { x: -6 + i * 2.4, z: 10.8, vx: 0, vz: 0, y: 0, auto: false, move: { x: 0, z: 0 }, action: { kind: "none" } }));
  Object.assign(m.athletes[0]!, { x: 0, z: 8, yaw: Math.PI, dribbleHand: 1, dribbleSide: 1 });
  Object.assign(m.athletes[1]!, { x: 0, z: 6.7, yaw: 0 });
  m.ball.holder = 0;
  m.ball.mode = "held";
  return m;
}

const move = (kind: Move["move"], side: 1 | -1, dir: { x: number; z: number }): Move => ({ kind: "move", t: 0, move: kind, dur: 0.4, side, dir, resolved: false });

describe("jukes", () => {
  it("beat an honest defender more often than not", () => {
    let beaten = 0;
    const runs = 80;
    for (let seed = 1; seed <= runs; seed++) {
      const m = setup(seed);
      m.press(0, "defend", { x: 1, z: 0 });
      const events: MatchEvent[] = [];
      for (let t = 0; t < 0.4; t += STEP) {
        m.step(STEP);
        events.push(...m.drainEvents());
      }
      if (events.some((e) => e.type === "shake")) beaten++;
    }
    expect(beaten / runs).toBeGreaterThan(0.4);
  });

  it("always leave the beaten defender in a reaction and slow", () => {
    const m = setup(1);
    const d = m.athletes[1]!;
    stun(d, move("crossover", 1, { x: 1, z: 0 }), false);
    expect(d.action).toMatchObject({ kind: "stumble", dur: SHAKE_TIME.slip[0], react: "slip" });
    expect(d.whiff).toBeGreaterThan(0);
    stun(d, move("crossover", 1, { x: 1, z: 0 }), true);
    expect(d.action).toMatchObject({ kind: "stumble", dur: SHAKE_TIME.ankles[1], react: "ankles" });
    expect(d.whiff).toBeGreaterThanOrEqual(JUKE.hardSlow);
  });

  it("throw the defender the wrong way", () => {
    // A crossover to the right sends him left.
    expect(wrongWay(move("crossover", 1, { x: 1, z: 0 }))).toEqual({ x: -1, z: -0 });
    // A spin straight by sends him off to the side, not into the handler's path.
    const side = wrongWay(move("spin", 1, { x: 0, z: -1 }));
    expect(Math.abs(side.x)).toBeCloseTo(1);
    expect(Math.abs(side.z)).toBeCloseTo(0);
  });
});
