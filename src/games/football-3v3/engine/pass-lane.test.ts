import { describe, expect, it } from "vitest";
import { laneCall, LANE_PLAY } from "./catch/lane-odds";
import { LANE, laneThreat } from "./pass-lane";
import { bySeat, peopleMatch, run, snap } from "./test-helpers";
import type { Match } from "./match";

const QB = { x: 0, z: 0 };
const SPOT = { x: 20, z: 0 };

describe("lane threat", () => {
  it("is nothing for a defender off the line, behind the QB or out of reach", () => {
    expect(laneThreat({ x: 10, z: LANE.reach + 0.1 }, QB, SPOT, LANE.reach, 1)).toBe(0);
    expect(laneThreat({ x: -2, z: 0 }, QB, SPOT, LANE.reach, 1)).toBe(0);
    expect(laneThreat({ x: 18, z: 0 }, QB, SPOT, LANE.reach, 0)).toBe(0);
  });

  it("grows the closer he sits to the line", () => {
    const on = laneThreat({ x: 18, z: 0 }, QB, SPOT, LANE.reach, 1);
    const edge = laneThreat({ x: 18, z: 1.8 }, QB, SPOT, LANE.reach, 1);
    expect(on).toBeGreaterThan(edge);
    expect(edge).toBeGreaterThan(0);
  });

  it("is biggest jumping the route in front of the receiver, less near the QB or trailing", () => {
    const front = laneThreat({ x: 19, z: 0.3 }, QB, SPOT, LANE.reach, 1);
    expect(front).toBeGreaterThan(laneThreat({ x: 3, z: 0.3 }, QB, SPOT, LANE.reach, 1));
    expect(front).toBeGreaterThan(laneThreat({ x: 21, z: 0.3 }, QB, SPOT, LANE.reach, 1));
  });

  it("is bigger on a long ball that hangs than a quick one, and never certain", () => {
    const quick = laneThreat({ x: 7, z: 0.3 }, QB, { x: 8, z: 0 }, LANE.reach, 1);
    const long = laneThreat({ x: 27, z: 0.3 }, QB, { x: 28, z: 0 }, LANE.reach, 1);
    expect(long).toBeGreaterThan(quick);
    expect(laneThreat({ x: 39, z: 0 }, QB, { x: 40, z: 0 }, LANE.reach, 1)).toBeLessThanOrEqual(LANE.max);
  });
});

describe("lane call", () => {
  it("picks, knocks or lets it by along the threat", () => {
    const t = 0.8;
    expect(laneCall(t, t * LANE_PLAY.pickShare - 0.01, true)).toBe("pick");
    expect(laneCall(t, t * LANE_PLAY.pickShare - 0.01, false)).toBe("knock");
    expect(laneCall(t, t - 0.01, true)).toBe("knock");
    expect(laneCall(t, t + 0.01, true)).toBe("past");
    expect(laneCall(0, 0, true)).toBe("past");
  });
});

/** Throws from the QB to the receiver after `lead` seconds of his run, and plays it out. */
function throwToReceiver(m: Match, lead: number) {
  const qb = bySeat(m, 0);
  const wr = bySeat(m, 1);
  m.setMove(wr.id, { x: m.sign, z: 0 });
  run(m, lead);
  m.setAim(qb.id, { x: wr.x - qb.x, z: wr.z - qb.z });
  run(m, 0.05);
  m.setAim(qb.id, null);
  const events = run(m, 5, () => m.phase !== "live" || (m.carrier() !== qb && m.carrier() !== null));
  return { qb, wr, events };
}

describe("passing lanes", () => {
  it("always completes a pass to an open receiver, short or long, however it is thrown", () => {
    for (let seed = 1; seed <= 12; seed++) {
      const m = peopleMatch({ seed });
      snap(m);
      // Every defender who could play the ball well out of the way.
      for (const d of m.athletes) if (d.team !== m.offense && d.role !== "lineman") d.z = 25;
      const { wr, events } = throwToReceiver(m, 0.4 + (seed % 4) * 0.5);
      expect(events.find((e) => e.type === "throw")).toMatchObject({ intercepting: false });
      expect(m.play?.caughtBy).toBe(wr.id);
    }
  });

  it("lets a defender jumping the route pick it or knock it away, and never a clean catch past him", () => {
    const outcomes = { pick: 0, knocked: 0 };
    for (let seed = 1; seed <= 12; seed++) {
      const m = peopleMatch({ seed });
      snap(m);
      const qb = bySeat(m, 0);
      const wr = bySeat(m, 1);
      const d = bySeat(m, 3);
      bySeat(m, 2).z = 25;
      // Right on the line, a step in front of the receiver.
      d.x = wr.x - (wr.x - qb.x) * 0.08;
      d.z = wr.z - (wr.z - qb.z) * 0.08;
      const { events } = throwToReceiver(m, 0);
      if (m.carrier() === d) outcomes.pick++;
      else if (events.some((e) => (e.type === "tip" || e.type === "breakUp") && e.id === d.id)) outcomes.knocked++;
    }
    expect(outcomes.pick).toBeGreaterThanOrEqual(2);
    expect(outcomes.knocked).toBeGreaterThanOrEqual(1);
    expect(outcomes.pick + outcomes.knocked).toBeGreaterThanOrEqual(7);
  });

  it("gives a computer defender in the lane a swat at it", () => {
    let swats = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const m = peopleMatch({ seed, level: "hard" });
      snap(m);
      const qb = bySeat(m, 0);
      const wr = bySeat(m, 1);
      const d = bySeat(m, 3);
      bySeat(m, 2).z = 25;
      m.setAuto(d.id, true);
      d.x = wr.x - (wr.x - qb.x) * 0.3;
      d.z = wr.z - (wr.z - qb.z) * 0.3;
      const { events } = throwToReceiver(m, 0);
      if (events.some((e) => (e.type === "breakUp" || e.type === "tip" || e.type === "intercept") && e.id === d.id)) swats++;
    }
    expect(swats).toBeGreaterThanOrEqual(3);
  });
});
