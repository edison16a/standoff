import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../roster";
import { Match, type Entry } from "./match";
import { RIM, STEP } from "./tuning";

const ENTRIES: Entry[] = CHARACTER_IDS.slice(0, 6).map((character, i) => ({ team: (i % 2) as 0 | 1, character, seat: i === 0 ? 1 : null }));

/** A live match with the first player holding the ball at a spot, one defender at `d` (or far off), everyone else far off. */
function setup(x: number, z: number, d: { x: number; z: number } | null = null, character = ENTRIES[0]!.character): Match {
  const m = new Match({ entries: ENTRIES.map((e, i) => (i === 0 ? { ...e, character } : e)), seed: 3, firstOffence: 0, botLevel: "training" });
  while (m.phase !== "live") m.step(STEP);
  m.athletes.forEach((a, i) => {
    a.x = i === 0 ? x : -6 + i * 0.5;
    a.z = i === 0 ? z : 10.5;
    a.vx = a.vz = 0;
    a.move = { x: 0, z: 0 };
  });
  if (d) Object.assign(m.athletes[1]!, { x: d.x, z: d.z });
  m.ball.holder = 0;
  m.ball.mode = "held";
  return m;
}

describe("finishing at the rim", () => {
  it("goes up the far side as a reverse from under the rim", () => {
    const m = setup(0.9, 1.3);
    m.press(0, "shoot");
    const act = m.athletes[0]!.action;
    expect(act.kind).toBe("drive");
    if (act.kind !== "drive") return;
    expect(act.layup === "reverse" || act.dunk).toBe(true);
    if (act.layup === "reverse") expect(Math.sign(act.to.x - RIM.x)).toBe(-1);
  });

  it("lays it up through a defender who is in the way, and says so with a bump", () => {
    const m = setup(0, 3.4, { x: 0, z: 2.6 }, "ashby");
    m.athletes[0]!.vz = -4;
    m.press(0, "shoot");
    const act = m.athletes[0]!.action;
    expect(act.kind).toBe("drive");
    if (act.kind === "drive" && !act.dunk) expect(act.layup).toBe("contact");
    expect(m.events.some((e) => e.type === "bump" || e.type === "knockdown")).toBe(true);
  });

  it("takes two steps to gather before leaving the floor", () => {
    const m = setup(0, 3.6);
    m.athletes[0]!.vz = -4.5;
    m.press(0, "shoot");
    const act = m.athletes[0]!.action;
    if (act.kind === "drive") expect(act.takeoff).toBeGreaterThanOrEqual(0.3);
  });

  it("hangs on the rim with the body dropping under the hands, then lets go", () => {
    const m = setup(0, 3.2, null, "whitlock");
    m.forcedDunk = "rimhang";
    m.athletes[0]!.vz = -4;
    m.press(0, "shoot");
    const a = m.athletes[0]!;
    const act = a.action;
    expect(act.kind === "drive" && act.dunk).toBe(true);
    if (act.kind !== "drive") return;
    let top = 0;
    let hanging = Infinity;
    for (let t = 0; t < act.land + 0.2; t += STEP) {
      m.step(STEP);
      if (a.action.kind !== "drive") break;
      if (a.action.t < act.finish) top = Math.max(top, a.y);
      else if (a.action.t > act.finish + act.rimHang * 0.5 && a.action.t < act.finish + act.rimHang) hanging = Math.min(hanging, a.y);
    }
    expect(hanging).toBeLessThan(top - 0.15);
    expect(a.y).toBe(0);
  });
});

describe("the stepback jumper", () => {
  it("hops back off a defender in the shooter's chest before rising", () => {
    const m = setup(0, 7.4, { x: 0, z: 6.6 });
    const a = m.athletes[0]!;
    m.press(0, "shoot");
    const act = a.action;
    expect(act.kind === "shoot" && act.step !== null).toBe(true);
    for (let t = 0; t < 0.3; t += STEP) m.step(STEP);
    expect(a.z).toBeGreaterThan(7.9);
  });

  it("goes straight up with nobody close", () => {
    const m = setup(0, 7.4);
    m.press(0, "shoot");
    const act = m.athletes[0]!.action;
    expect(act.kind === "shoot" && act.step === null).toBe(true);
  });
});
