import { describe, expect, it } from "vitest";
import type { GameEvent } from "./events";
import { Fencer } from "./fencer";
import { Referee, type Verdict } from "./referee";
import { DEFLECTED_MS, DOUBLE_WINDOW_MS, JAB_IMPACT_MS, PARRY_GRACE_MS, PARRY_RECOVERY_MS, REACH } from "./rules";

function setup(gap = REACH - 0.2, parryWindow = 1000) {
  const fencers = { 1: new Fencer(1, "vale"), 2: new Fencer(2, "iron") };
  fencers[1].x = -gap / 2;
  fencers[2].x = gap / 2;
  const referee = new Referee(fencers, () => parryWindow);
  return { fencers, referee };
}

/** Holds a fencer's blade at a pitch long enough to fill its aim history. */
function point(fencer: Fencer, pitch: number, ticks = 20) {
  fencer.input = { pitch, yaw: 0, roll: 0, move: 0 };
  for (let i = 0; i < ticks; i++) fencer.followPose(16);
}

/** Steps the referee in 10 ms slices and gathers everything it says. */
function run(referee: Referee, from: number, to: number) {
  const events: GameEvent[] = [];
  let verdict: Verdict | null = null;
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
    expect(run(referee, 0, 400).verdict).toMatchObject({ kind: "touch", scorer: 1 });
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
    expect(events).toContainEqual(expect.objectContaining({ type: "whiff", slot: 2, reason: "far" }));
  });

  it("calls a whiff when the tip points way off line", () => {
    const { referee, fencers } = setup();
    point(fencers[1], 1.4, 60);
    referee.jab(1, 0);
    const { events, verdict } = run(referee, 0, 400);
    expect(verdict).toBeNull();
    expect(events).toContainEqual(expect.objectContaining({ type: "whiff", slot: 1, reason: "wide" }));
  });

  it("judges a jab by where the blade pointed before the flick threw it off", () => {
    const { referee, fencers } = setup();
    point(fencers[1], 0);
    // The flick itself throws the phone hard in the last few readings.
    point(fencers[1], -1.45, 3);
    referee.jab(1, 0);
    expect(run(referee, 0, 400).verdict).toMatchObject({ kind: "touch", scorer: 1 });
  });

  it("cancels two touches that land together", () => {
    const { referee } = setup();
    referee.jab(1, 0);
    referee.jab(2, DOUBLE_WINDOW_MS / 2);
    expect(run(referee, 0, 400).verdict).toMatchObject({ kind: "double" });
  });

  it("flags a clash when both attack and one is parried", () => {
    const { referee, fencers } = setup();
    // Player one attacks off line and misses, then parries the counter.
    point(fencers[1], 1.4);
    referee.jab(1, 0);
    referee.jab(2, 150);
    run(referee, 0, JAB_IMPACT_MS);
    referee.parry(1, JAB_IMPACT_MS + 10);
    const { events, verdict } = run(referee, JAB_IMPACT_MS + 10, 700);
    expect(verdict).toBeNull();
    expect(events).toContainEqual(expect.objectContaining({ type: "parried", attacker: 2, clash: true }));
  });

  it("ignores a jab from a deflected fencer", () => {
    const { referee } = setup();
    referee.parry(2, 0);
    referee.jab(1, 10);
    run(referee, 0, 300);
    expect(referee.jab(1, 350)).toEqual([]);
  });

  it("drops your own parry the moment you attack", () => {
    const { referee } = setup();
    referee.parry(1, 0);
    referee.jab(1, 100);
    referee.jab(2, 120);
    // Player one's parry is gone, so both land together: a double, not a parry.
    expect(run(referee, 0, 900).verdict).toMatchObject({ kind: "double" });
  });

  it("will not start a parry while your own lunge is still going out", () => {
    const { referee } = setup();
    referee.jab(1, 0);
    expect(referee.parry(1, 60)).toEqual([]);
  });

  it("lets a parry that arrives just after the tip still save the touch", () => {
    const { referee } = setup();
    referee.jab(1, 0);
    run(referee, 0, JAB_IMPACT_MS + 20);
    const events = referee.parry(2, JAB_IMPACT_MS + PARRY_GRACE_MS - 10);
    expect(events).toContainEqual(expect.objectContaining({ type: "parried", attacker: 1 }));
    expect(run(referee, JAB_IMPACT_MS + 30, 600).verdict).toBeNull();
  });

  it("closes a parry that saved a touch late, like one that blocked in time", () => {
    const { referee, fencers } = setup();
    referee.jab(1, 0);
    run(referee, 0, JAB_IMPACT_MS + 20);
    const at = JAB_IMPACT_MS + PARRY_GRACE_MS - 10;
    referee.parry(2, at);
    expect(fencers[2].frame(at + 10).parrying).toBe(false);
    // Its guard is ready for the next one straight away.
    expect(referee.parry(2, at + 20)).toHaveLength(1);
  });

  it("counts the touch when the parry comes too late", () => {
    const { referee } = setup();
    referee.jab(1, 0);
    const { verdict } = run(referee, 0, JAB_IMPACT_MS + PARRY_GRACE_MS + 30);
    expect(verdict).toMatchObject({ kind: "touch", scorer: 1 });
    expect(referee.parry(2, JAB_IMPACT_MS + PARRY_GRACE_MS + 40)).not.toContainEqual(expect.objectContaining({ type: "parried" }));
  });

  it("makes a parry that blocked nothing wait before the next one", () => {
    const { referee } = setup(REACH - 0.2, 500);
    expect(referee.parry(2, 0)).toHaveLength(1);
    expect(referee.parry(2, 600)).toEqual([]);
    expect(referee.parry(2, 500 + PARRY_RECOVERY_MS + 10)).toHaveLength(1);
  });

  it("blocks only the first jab of a parry", () => {
    const { referee } = setup();
    referee.parry(2, 0);
    referee.jab(1, 10);
    run(referee, 0, 300);
    const retry = JAB_IMPACT_MS + 10 + DEFLECTED_MS + 10;
    referee.jab(1, retry);
    expect(run(referee, 300, retry + 400).verdict).toMatchObject({ kind: "touch", scorer: 1 });
  });
});
