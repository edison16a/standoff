import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../../builds";
import { Match, type Entry } from "../match";
import { STEP } from "../tuning";
import type { Forced } from "./select";

const ENTRIES: Entry[] = BUILD_IDS.slice(0, 6).map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: null }));

/** Player 0 drives from the front and player 1 steps under the rim in his way. */
function slamOver(forced: Forced): Match {
  const m = new Match({ entries: ENTRIES, seed: 9, firstOffence: 0 });
  while (m.phase !== "live") m.step(STEP);
  m.athletes.forEach((a, i) => Object.assign(a, { x: i === 0 ? 0.3 : -6 + i * 0.4, z: i === 0 ? 4 : 11, vx: 0, vz: i === 0 ? -4.5 : 0, auto: false, move: { x: 0, z: 0 }, action: { kind: "none" } }));
  m.ball.holder = 0;
  m.ball.mode = "held";
  m.ball.pos = { x: 0.55, y: 0.9, z: 3.8 };
  m.forcedFinish = forced;
  m.press(0, "shoot");
  // He steps in under the rim once the gather has started, too late to change the finish.
  Object.assign(m.athletes[1]!, { x: 0, z: 1.6 });
  return m;
}

/** Steps until the slam and returns what the defender is doing just after it. */
function afterSlam(m: Match): string {
  const a = m.athletes[0]!;
  for (let i = 0; i < 400 && a.action.kind === "drive" && !a.action.released; i++) m.step(STEP);
  expect(a.action.kind).toBe("drive");
  return m.athletes[1]!.action.kind;
}

describe("the poster dunk", () => {
  it("sends the man under it off his feet as the slam comes down", () => {
    expect(afterSlam(slamOver({ dunk: "poster" }))).toBe("stumble");
  });

  it("leaves him standing on any other dunk", () => {
    expect(afterSlam(slamOver({ dunk: "twoHand" }))).not.toBe("stumble");
  });
});
