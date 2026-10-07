import { describe, expect, it } from "vitest";
import { createAthlete } from "./athlete";
import { contestFor } from "./contest";
import type { Athlete } from "./types";

/** A shooter at the top of the key facing the rim, and a defender between him and it. */
function pair(gap: number): [Athlete, Athlete] {
  const shooter = createAthlete(0, 0, 0, "shooter", null);
  const d = createAthlete(1, 1, 0, "allround", null);
  Object.assign(shooter, { x: 0, z: 8.5, yaw: Math.PI });
  // Yaw 0 faces out toward the shooter.
  Object.assign(d, { x: 0, z: 8.5 - gap, yaw: 0 });
  return [shooter, d];
}

describe("the contest", () => {
  it("gives a square defender on his feet a hand up, and one caught side on less", () => {
    const [shooter, d] = pair(1);
    const square = contestFor(shooter, [d], "jumper").contest;
    d.yaw = Math.PI / 2;
    const side = contestFor(shooter, [d], "jumper").contest;
    expect(square).toBeGreaterThan(0.55);
    expect(side).toBeLessThan(square - 0.1);
  });

  it("reaches further for a defender closing out at speed", () => {
    const [shooter, d] = pair(2.5);
    const still = contestFor(shooter, [d], "jumper").contest;
    d.vz = 4.5;
    expect(contestFor(shooter, [d], "jumper").contest).toBeGreaterThan(still + 0.1);
  });

  it("barely counts a defender still reeling from a shake", () => {
    const [shooter, d] = pair(1);
    const set = contestFor(shooter, [d], "jumper").contest;
    d.action = { kind: "stumble", t: 0, dur: 0.8, react: "bite" };
    expect(contestFor(shooter, [d], "jumper").contest).toBeLessThan(set * 0.4);
  });
});
