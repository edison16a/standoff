import { describe, expect, it } from "vitest";
import { Fencer } from "./fencer";
import { Referee } from "./referee";
import { DOUBLE_WINDOW_MS, JAB_IMPACT_MS, REACH } from "./rules";

function setup(gap = REACH - 0.2) {
  const fencers = { 1: new Fencer(1, "vale"), 2: new Fencer(2, "iron") };
  fencers[1].x = -gap / 2;
  fencers[2].x = gap / 2;
  const referee = new Referee(fencers, () => 1000);
  return { fencers, referee };
}

/** Steps the referee in 10 ms slices and gathers everything it says. */
function run(referee: Referee, from: number, to: number) {
  const events = [];
  let verdict = null;
  for (let t = from; t <= to; t += 10) {
    const step = referee.step(t);
    events.push(...step.events);
    verdict ??= step.verdict;
  }
  return { events, verdict };
}

describe("Referee", () => {
  it("scores a jab that lands in range", () => {
    const { referee } = setup();
    referee.jab(1, 0);
    const { verdict } = run(referee, 0, 400);
    expect(verdict).toMatchObject({ kind: "touch", scorer: 1 });
  });

  it("blocks a jab that arrives inside an open parry window", () => {
    const { referee, fencers } = setup();
    referee.jab(1, 0);
    referee.parry(2, JAB_IMPACT_MS - 40);
    const { events, verdict } = run(referee, 0, 400);
    expect(verdict).toBeNull();
    expect(events).toContainEqual(expect.objectContaining({ type: "parried", attacker: 1 }));
    expect(fencers[1].action).toBe("deflected");
  });

  it("does not block once the parry window has closed", () => {
    const { referee } = setup();
    referee.parry(2, 0);
    referee.jab(1, 1100);
    expect(run(referee, 1100, 1500).verdict).toMatchObject({ kind: "touch", scorer: 1 });
  });

  it("calls a whiff when out of range", () => {
    const { referee } = setup(REACH + 1);
    referee.jab(2, 0);
    const { events, verdict } = run(referee, 0, 400);
    expect(verdict).toBeNull();
    expect(events).toContainEqual(expect.objectContaining({ type: "whiff", slot: 2 }));
  });

  it("calls a whiff when the tip points way off line", () => {
    const { referee, fencers } = setup();
    fencers[1].input = { pitch: 1.4, yaw: 0, roll: 0, move: 0 };
    for (let i = 0; i < 60; i++) fencers[1].followPose(16);
    referee.jab(1, 0);
    expect(run(referee, 0, 400).verdict).toBeNull();
  });

  it("cancels two touches that land together", () => {
    const { referee } = setup();
    referee.jab(1, 0);
    referee.jab(2, DOUBLE_WINDOW_MS / 2);
    expect(run(referee, 0, 400).verdict).toMatchObject({ kind: "double" });
  });

  it("flags a clash when both jab and one is parried", () => {
    const { referee } = setup();
    referee.jab(2, 0);
    referee.parry(2, 60);
    referee.jab(1, 100);
    const { events } = run(referee, 0, 500);
    expect(events).toContainEqual(expect.objectContaining({ type: "parried", attacker: 1, clash: true }));
  });

  it("ignores a jab from a deflected fencer", () => {
    const { referee } = setup();
    referee.parry(2, 0);
    referee.jab(1, 10);
    run(referee, 0, 200);
    expect(referee.jab(1, 250)).toEqual([]);
  });
});
