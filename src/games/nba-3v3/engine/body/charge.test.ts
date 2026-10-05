import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../../builds";
import { createAthlete } from "../athlete";
import { Match, type Entry } from "../match";
import { STEP } from "../tuning";
import type { Athlete } from "../types";
import { CHARGE, endCharge, forceContactFoul, judge } from "./charge";

/** A ball handler at the top running down at the rim, and a defender a stride in front of him, facing him. */
function pair(defenderZ = 5): [Athlete, Athlete] {
  const handler = createAthlete(0, 0, 0, "dunker", null);
  Object.assign(handler, { x: 0, z: defenderZ + 0.8, vz: -4.5, yaw: Math.PI });
  const defender = createAthlete(1, 1, 0, "lockdown", null);
  Object.assign(defender, { x: 0, z: defenderZ, yaw: 0 });
  return [handler, defender];
}

describe("the referee's read of a collision", () => {
  it("gives a charge when the handler runs over a defender who is set and square", () => {
    const [h, d] = pair();
    expect(judge(h, d, 4.5, 4.5, 0)).toBe("charge");
  });

  it("still gives the charge on a defender giving ground straight back", () => {
    const [h, d] = pair();
    d.vz = 0.8;
    expect(judge(h, d, 3.7, 4.5, -0.8)).toBe("charge");
  });

  it("never takes a charge under the rim: there it is a block", () => {
    const [h, d] = pair(1.9);
    expect(judge(h, d, 4.5, 4.5, 0)).toBe("block");
  });

  it("calls a defender stepping into the handler, or sliding across late, for blocking", () => {
    const [h, d] = pair();
    expect(judge(h, d, 5, 2.5, 2.5)).toBe("block");
    d.vx = 2.6;
    expect(judge(h, d, 4.5, 4.5, 0)).toBe("block");
  });

  it("lets incidental contact go, and a defender turned away is no wall", () => {
    const [h, d] = pair();
    expect(judge(h, d, CHARGE.closing - 0.5, 2, 0)).toBeNull();
    d.yaw = Math.PI;
    expect(judge(h, d, 4.5, 4.5, 0)).toBeNull();
  });

  it("only judges a dribbler: a shooter or a passer is a different call", () => {
    const [h, d] = pair();
    h.action = { kind: "pass", t: 0 };
    expect(judge(h, d, 4.5, 4.5, 0)).toBeNull();
  });
});

describe("the calls in a game", () => {
  const ENTRIES: Entry[] = BUILD_IDS.slice(0, 6).map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: null }));
  function live(): Match {
    const m = new Match({ entries: ENTRIES, seed: 5, firstOffence: 0 });
    while (m.phase !== "live") m.step(STEP);
    return m;
  }

  it("turns a charge into the other team's ball, with the referee showing it a moment", () => {
    const m = live();
    const handler = m.holder!;
    expect(forceContactFoul(m, false)).toBe(true);
    expect(m.phase).toBe("dead");
    expect(m.nextOffence).not.toBe(handler.team);
    expect(m.ball.holder).toBeNull();
    expect(m.foulCall?.kind).toBe("charge");
    expect(m.drainEvents().some((e) => e.type === "foul" && e.call === "charge" && e.id === handler.id)).toBe(true);
    m.time += CHARGE.show + 0.1;
    endCharge(m);
    expect(m.foulCall).toBeNull();
  });

  it("sends the handler to the line for two on a blocking foul", () => {
    const m = live();
    const handler = m.holder!;
    expect(forceContactFoul(m, true)).toBe(true);
    expect(m.phase).toBe("freeThrow");
    expect(m.freeThrows?.shooter).toBe(handler.id);
    expect(m.foulCall?.kind).toBe("block");
  });
});
