import { describe, expect, it } from "vitest";
import { createAthlete } from "./body";
import { BEAT, beatBy } from "./juke-beat";
import { bySeat, peopleMatch, run, snap } from "./test-helpers";
import type { Athlete } from "./types";

/** The carrier runs along +x; a defender of `build` stands at (x, z). */
function face(build: "powerback" | "speedster" | "lockdown" | null, x: number, z = 0): [Athlete, Athlete] {
  const runner = createAthlete(0, 0, "runner", 0, "routerunner", null);
  Object.assign(runner, { vx: 7, yaw: Math.PI / 2 });
  const d = createAthlete(1, 1, build ? "runner" : "lineman", 0, build, null);
  Object.assign(d, { x, z });
  return [runner, d];
}

describe("a juke beating the men in front of it", () => {
  it("drops a heavy, stiff man right on top of it and makes him stumble a little farther out", () => {
    expect(beatBy(...face("powerback", 0.9))).toBe("fall");
    expect(beatBy(...face("powerback", 1.5))).toBe("stumble");
    expect(beatBy(...face(null, 0.9))).toBe("fall");
  });

  it("leaves light or agile men on their feet, and anyone behind or out of range", () => {
    expect(beatBy(...face("speedster", 0.9))).toBeNull();
    expect(beatBy(...face("lockdown", 0.9))).toBe("stumble");
    expect(beatBy(...face("powerback", -0.9))).toBeNull();
    expect(beatBy(...face("powerback", BEAT.range + 0.2))).toBeNull();
  });

  it("puts the fooled defender on the turf in a match as the dodge opens", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    const d = bySeat(m, 3);
    // A heavy defender planted just ahead of the QB's run.
    d.mass = 120;
    d.build = "powerback";
    qb.vx = m.sign * 5;
    qb.move = { x: m.sign, z: 0 };
    d.x = qb.x + m.sign * 0.95;
    d.z = qb.z + 0.2;
    m.press(qb.id, "juke");
    run(m, 0.15);
    expect(d.action).toMatchObject({ kind: "down", cause: "juked" });
  });
});
