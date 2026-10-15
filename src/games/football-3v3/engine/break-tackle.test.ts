import { describe, expect, it } from "vitest";
import type { BuildId } from "../builds";
import { createAthlete } from "./body";
import { BREAK, breakKindFor, breakOdds } from "./break-tackle";
import { updateLunge } from "./tackle";
import { bySeat, peopleMatch, snap } from "./test-helpers";
import type { Athlete } from "./types";
import { norm2 } from "./vec";

function man(id: number, build: BuildId, team: 0 | 1, x: number, z: number, vx = 0, vz = 0): Athlete {
  const a = createAthlete(id, team, "runner", 0, build, null);
  Object.assign(a, { x, z, vx, vz, yaw: Math.atan2(vx, vz) });
  return a;
}

// The carrier runs along +x; n is the hit's line from tackler to carrier.
const line = (t: Athlete, c: Athlete) => norm2({ x: c.x - t.x, z: c.z - t.z });

describe("which tackles can be broken", () => {
  it("gives a man at speed a chance head on, more for a stronger, faster, heavier one", () => {
    const back = man(0, "powerback", 0, 0, 0, 8, 0);
    const wr = man(0, "speedster", 0, 0, 0, 8, 0);
    const d = man(1, "routerunner", 1, 1, 0, -5, 0);
    const big = breakOdds(back, d, line(d, back), 8);
    const small = breakOdds(wr, d, line(d, wr), 8);
    expect(big).toBeGreaterThan(small);
    expect(small).toBeGreaterThan(0);
    expect(big).toBeLessThanOrEqual(BREAK.cap);
    expect(breakOdds(wr, d, line(d, wr), 6)).toBeLessThan(small);
  });

  it("never from the side or behind, however fast he is going", () => {
    const back = man(0, "powerback", 0, 0, 0, 9, 0);
    for (const d of [man(1, "speedster", 1, 0, 1), man(1, "speedster", 1, -1, 0), man(1, "speedster", 1, 0.3, -1)]) {
      expect(breakOdds(back, d, line(d, back), 9)).toBe(0);
    }
  });

  it("never at a crawl, even head on", () => {
    const back = man(0, "powerback", 0, 0, 0, 2, 0);
    const d = man(1, "speedster", 1, 1, 0);
    expect(breakOdds(back, d, line(d, back), BREAK.speed - 0.5)).toBe(0);
  });

  it("trucks with a big or very strong man and stiff arms with anyone else", () => {
    expect(breakKindFor(man(0, "powerback", 0, 0, 0), man(1, "lockdown", 1, 1, 0))).toBe("truck");
    expect(breakKindFor(man(0, "routerunner", 0, 0, 0), man(1, "lockdown", 1, 1, 0))).toBe("stiffarm");
    expect(breakKindFor(man(0, "gunslinger", 0, 0, 0), man(1, "speedster", 1, 1, 0))).toBe("truck");
  });
});

describe("in a match", () => {
  /** A defender already lunging into a power back running at 8 m/s, from (dx, dz) off him. */
  function lungeAt(draws: number, dx: number, dz: number) {
    const m = peopleMatch();
    snap(m);
    // A different roll each time: the match's dice moved on by `draws`.
    for (let i = 0; i < draws; i++) m.rng.next();
    const qb = bySeat(m, 0);
    m.play!.qbRun = true;
    Object.assign(qb, { build: "powerback", mass: 116, vx: m.sign * 8, vz: 0, yaw: Math.atan2(m.sign, 0) });
    const d = bySeat(m, 3);
    Object.assign(d, { x: qb.x + dx * m.sign, z: qb.z + dz, vx: 0, vz: 0 });
    d.action = { kind: "lunge", t: 0.1, dur: 0.5, dir: line(d, qb), target: qb.id, approach: "wrap" };
    updateLunge(m, d, 1 / 120);
    return { qb, d };
  }

  it("always brings him down from the side", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { qb } = lungeAt(seed, 0, 1.0);
      expect(qb.action.kind).toBe("down");
      expect(qb.breaking).toBeNull();
    }
  });

  it("lets him run through some head on tackles, putting the tackler on the turf and keeping most of his run", () => {
    let breaks = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const { qb, d } = lungeAt(seed, 1.0, 0);
      if (qb.action.kind === "down") continue;
      breaks++;
      expect(qb.breaking?.kind).toBe("truck");
      expect(d.action).toMatchObject({ kind: "down", cause: "trucked" });
      expect(Math.hypot(qb.vx, qb.vz)).toBeGreaterThan(5);
    }
    expect(breaks).toBeGreaterThan(3);
    expect(breaks).toBeLessThan(27);
  });
});
