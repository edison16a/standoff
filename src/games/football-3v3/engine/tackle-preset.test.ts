import { describe, expect, it } from "vitest";
import type { BuildId } from "../builds";
import { createAthlete } from "./body";
import { knockDown } from "./down";
import { approachFor, finishFor, helpersFor } from "./tackle-preset";
import { bySeat, peopleMatch, snap } from "./test-helpers";
import type { Athlete } from "./types";

/** A player at (x, z) running at (vx, vz), on `team`. */
function man(id: number, build: BuildId, team: 0 | 1, x: number, z: number, vx = 0, vz = 0): Athlete {
  const a = createAthlete(id, team, "runner", 0, build, null);
  Object.assign(a, { x, z, vx, vz, yaw: Math.atan2(vx, vz) });
  return a;
}

// The carrier runs up the field along +x at 7 m/s.
const carrier = (build: BuildId = "routerunner") => man(0, build, 0, 0, 0, 7, 0);

describe("picking the tackle before the leap", () => {
  it("drives a man back when a defender his size meets him head on and close", () => {
    expect(approachFor(man(1, "powerback", 1, 1.6, 0.2, -5, 0), carrier())).toBe("drive");
  });

  it("leaps at him from farther out head on, and cuts the legs when the tackler is the smaller man", () => {
    expect(approachFor(man(1, "powerback", 1, 2.5, 0, -5, 0), carrier())).toBe("wrap");
    expect(approachFor(man(1, "speedster", 1, 1.5, 0, -5, 0), carrier("powerback"))).toBe("ankle");
  });

  it("wraps from the side, or goes low at the shins when much lighter", () => {
    expect(approachFor(man(1, "lockdown", 1, 0, 1.8, 0, -4), carrier())).toBe("wrap");
    expect(approachFor(man(1, "speedster", 1, 0, 1.8, 0, -4), carrier("powerback"))).toBe("ankle");
  });

  it("dives at the heels of a runner pulling away from behind, and wraps one he has run down", () => {
    expect(approachFor(man(1, "lockdown", 1, -2.2, 0, 6, 0), carrier())).toBe("shoestring");
    expect(approachFor(man(1, "lockdown", 1, -1.4, 0, 6.2, 0), carrier())).toBe("shoestring");
    expect(approachFor(man(1, "lockdown", 1, -1.4, 0, 9, 0), carrier())).toBe("wrap");
  });
});

describe("finishing the tackle once the momentum brings him down", () => {
  it("makes a pile when help is there", () => {
    expect(finishFor("wrap", 1, 0)).toBe("gang");
    expect(finishFor("drive", 2, 3)).toBe("gang");
  });

  it("only drives him back if the hit moved him backward", () => {
    expect(finishFor("drive", 0, 2)).toBe("drive");
    expect(finishFor("drive", 0, 0.1)).toBe("wrap");
  });

  it("keeps the approach otherwise", () => {
    for (const k of ["wrap", "ankle", "shoestring"] as const) expect(finishFor(k, 0, 0)).toBe(k);
  });
});

describe("who piles in", () => {
  it("takes the nearest standing defenders, never linemen, teammates or men on the ground", () => {
    const c = carrier();
    const t = man(1, "lockdown", 1, 1, 0);
    const near = man(2, "powerback", 1, 0.8, 0.6);
    const far = man(3, "scrambler", 1, 4, 0);
    const mate = man(4, "speedster", 0, 0.5, 0.2);
    const down = man(5, "gunslinger", 1, 0.4, 0);
    knockDown(down, 1, "whiff");
    const lineman = createAthlete(6, 1, "lineman", 0, null, null);
    Object.assign(lineman, { x: 0.3, z: -0.3 });
    expect(helpersFor([c, t, near, far, mate, down, lineman], c, t).map((a) => a.id)).toEqual([2]);
  });
});

describe("in a match", () => {
  it("picks the approach the moment the tackle is pressed", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    const d = bySeat(m, 3);
    d.x = qb.x + m.sign * 1.6;
    d.z = qb.z;
    d.vx = -m.sign * 4;
    qb.vx = m.sign * 3;
    m.press(d.id, "tackle");
    expect(d.action).toMatchObject({ kind: "lunge", approach: approachFor(d, qb) });
  });
});
