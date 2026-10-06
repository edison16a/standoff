import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../builds";
import type { MatchEvent } from "./events";
import { FLOATER } from "./floater";
import { Match, type Entry } from "./match";
import { RIM, STEP } from "./tuning";

const ENTRIES: Entry[] = BUILD_IDS.slice(0, 6).map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: i === 0 ? 1 : null }));

/** A live match with the first player running at the rim with the ball from `z`, and a big man waiting when asked. */
function running(z: number, big: boolean): Match {
  const m = new Match({ entries: ENTRIES, seed: 4, firstOffence: 0 });
  while (m.phase !== "live") m.step(STEP);
  m.athletes.forEach((a, i) => Object.assign(a, { x: -6 + i * 0.4, z: 10.5, vx: 0, vz: 0, auto: false, move: { x: 0, z: 0 }, action: { kind: "none" } }));
  Object.assign(m.athletes[0]!, { x: 0, z, vx: 0, vz: -4.5, yaw: Math.PI, move: { x: 0, z: -1 } });
  // The Lockdown defender, long armed, on the other team.
  if (big) Object.assign(m.athletes[3]!, { x: 0.1, z: RIM.z + 1.1 });
  m.ball.holder = 0;
  m.ball.mode = "held";
  return m;
}

describe("the floater", () => {
  it("goes up early off the run from the edge of the paint, soft and high", () => {
    const m = running(RIM.z + 4.2, false);
    m.press(0, "shoot");
    const act = m.athletes[0]!.action;
    expect(act.kind === "shoot" && act.float).toBe(true);
    let apex = 0;
    let shot: MatchEvent | null = null;
    let releasedAt = -1;
    for (let t = 0; t < 2.5; t += STEP) {
      m.step(STEP);
      for (const e of m.drainEvents()) if (e.type === "shot") shot = e;
      if (shot && releasedAt < 0) releasedAt = t;
      if (m.ball.mode !== "held") apex = Math.max(apex, m.ball.pos.y);
    }
    expect(shot).not.toBeNull();
    expect(releasedAt).toBeLessThan(FLOATER.release + 0.05);
    expect(apex).toBeGreaterThan(RIM.y + 1.1);
  });

  it("is thrown over a big man waiting in the lane even close in", () => {
    const m = running(RIM.z + 2.9, true);
    m.press(0, "shoot");
    const act = m.athletes[0]!.action;
    expect(act.kind === "shoot" && act.float).toBe(true);
  });

  it("leaves a straight run at an open rim from close in to the layup", () => {
    const m = running(RIM.z + 2.9, false);
    m.press(0, "shoot");
    expect(m.athletes[0]!.action.kind).toBe("drive");
  });
});
