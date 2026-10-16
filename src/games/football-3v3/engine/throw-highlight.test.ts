import { describe, expect, it } from "vitest";
import { knockDown } from "./down";
import type { Match } from "./match";
import { playbookView } from "./playbook/view";
import { bySeat, peopleMatch, run, snap } from "./test-helpers";
import { hotRunner } from "./throw-highlight";

/** A computer runner of the play, by his slot among the throw buttons. */
function botSlot(m: Match): { id: number; slot: number } {
  const slot = m.play!.runners.findIndex((id) => m.athletes[id]!.auto);
  return { id: m.play!.runners[slot]!, slot };
}

const lit = (m: Match) => playbookView(m)?.runners.filter((r) => r.hot).map((r) => r.id) ?? [];

describe("the QB's finger held on a throw button", () => {
  it("lights that runner up on the big screen, moves with the finger, and goes off the buttons", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    m.highlight(qb.id, 0);
    expect(lit(m)).toEqual([m.play!.runners[0]]);
    m.highlight(qb.id, 2);
    expect(lit(m)).toEqual([m.play!.runners[2]]);
    run(m, 0.2);
    expect(hotRunner(m)).toBe(m.play!.runners[2]);
    m.highlight(qb.id, null);
    expect(lit(m)).toEqual([]);
    expect(m.ball.state).toBe("held");
  });

  it("throws nothing by itself, and letting go on the button throws to him", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    const { id, slot } = botSlot(m);
    m.highlight(qb.id, slot);
    run(m, 0.5);
    expect(m.play!.passed).toBe(false);
    m.throwTo(qb.id, slot);
    expect(m.play!.hot).toBeNull();
    run(m, 1, () => m.ball.state === "pass");
    expect(m.ball.pass!.to).toBe(id);
    expect(playbookView(m)).toBeNull();
  });

  it("shows the rest of a computer runner's route while he is lit", () => {
    const m = peopleMatch();
    snap(m);
    const { slot } = botSlot(m);
    m.highlight(bySeat(m, 0).id, slot);
    const hot = playbookView(m)!.runners.find((r) => r.hot)!;
    expect(hot.arrow!.length).toBeGreaterThan(1);
    expect(playbookView(m)!.runners.filter((r) => !r.hot).every((r) => r.arrow === null)).toBe(true);
  });

  it("lights nothing before the snap or for a runner on the turf, and drops a runner who goes down for good", () => {
    const m = peopleMatch();
    const qb = bySeat(m, 0);
    m.choose(qb.id, "throw");
    if (m.huddle) m.playbook(qb.id, 0);
    m.highlight(qb.id, 1);
    expect(m.play!.hot).toBeNull();
    m.press(qb.id, "hike");
    run(m, 1, () => m.carrier() === qb);
    const { id, slot } = botSlot(m);
    m.highlight(qb.id, slot);
    knockDown(m.athletes[id]!, 0.3, "pancaked");
    run(m, 0.05);
    expect(m.play!.hot).toBeNull();
    run(m, 1);
    expect(lit(m)).toEqual([]);
  });

  it("clears on a sack, and the next play starts clear", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    const d = bySeat(m, 3);
    m.highlight(qb.id, 0);
    d.x = qb.x + m.sign * 2;
    d.z = qb.z;
    m.press(d.id, "tackle");
    run(m, 1, () => m.phase === "dead");
    expect(m.phase).toBe("dead");
    expect(hotRunner(m)).toBeNull();
    expect(m.play?.hot ?? null).toBeNull();
  });

  it("clears when the QB takes off and runs", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    m.highlight(qb.id, 3);
    m.press(qb.id, "run");
    run(m, 0.05);
    expect(m.play!.hot).toBeNull();
  });

  it("is the QB's alone: a defender's message lights nothing", () => {
    const m = peopleMatch();
    snap(m);
    m.highlight(bySeat(m, 3).id, 0);
    expect(m.play!.hot).toBeNull();
  });
});
