import { describe, expect, it } from "vitest";
import type { Entry } from "./lineup";
import { FIELD, YARD } from "./field";
import { Match } from "./match";
import { keepGoalInside, ROUTE_EDGE } from "./route-bounds";
import { deepRoute, routePoints, ROUTES } from "./routes";
import { BOTS, bySeat, run, snap } from "./test-helpers";
import { STEP } from "./tuning";
import type { Athlete } from "./types";

const still = (x: number, z: number) => ({ x, z, vx: 0, vz: 0 });
/** Over a line by more than `slack` metres. */
const isOut = (a: Athlete, slack = 0) => Math.abs(a.z) > FIELD.halfWidth + slack || Math.abs(a.x) > FIELD.endX + slack;

/** People at QB, so nobody throws unless the test does, and a computer runner on each side. */
const ROUTE_RUNNERS: Entry[] = [
  { team: 0, role: "qb", build: "gunslinger", seat: 0 },
  { team: 0, role: "runner", build: "speedster", seat: null },
  { team: 1, role: "qb", build: "scrambler", seat: 2 },
  { team: 1, role: "runner", build: "lockdown", seat: null },
];

describe("route waypoints", () => {
  it("never leave the field, from anywhere a receiver lines up", () => {
    for (const kind of ROUTES) {
      for (const sign of [1, -1] as const) {
        for (let z = -FIELD.halfWidth + 1; z <= FIELD.halfWidth - 1; z += 2) {
          for (const x of [-40, 0, 30, 45, 52]) {
            for (const p of [...routePoints(kind, { x: x * sign, z }, sign), ...deepRoute({ x: x * sign, z }, sign)]) {
              expect(Math.abs(p.z)).toBeLessThanOrEqual(ROUTE_EDGE.side);
              expect(Math.abs(p.x)).toBeLessThanOrEqual(ROUTE_EDGE.end);
            }
          }
        }
      }
    }
  });

  it("keep the deep route inside the numbers when he lines up inside them", () => {
    for (const p of deepRoute({ x: 0, z: 9 }, 1)) expect(Math.abs(p.z)).toBeLessThanOrEqual(ROUTE_EDGE.numbers + 1e-9);
    expect(deepRoute({ x: 0, z: 9 }, 1).at(-1)!.x).toBeGreaterThan(30 * YARD);
  });
});

describe("staying in bounds", () => {
  it("leaves a stick alone in the open field", () => {
    expect(keepGoalInside(still(0, 0), { x: 0.6, z: 0.8 }, 1)).toEqual({ x: 0.6, z: 0.8 });
  });

  it("turns a run at the sideline upfield along it, at the same speed", () => {
    const g = keepGoalInside(still(10, FIELD.halfWidth - 2), { x: 0, z: 1 }, 1);
    expect(g.z).toBeLessThan(0.5);
    expect(g.x).toBeGreaterThan(0.8);
    expect(Math.hypot(g.x, g.z)).toBeCloseTo(1, 5);
    // Attacking the other way he turns the other way upfield.
    expect(keepGoalInside(still(10, -FIELD.halfWidth + 2), { x: 0, z: -1 }, -1).x).toBeLessThan(-0.8);
  });

  it("comes straight back in from over the sideline or the end line", () => {
    expect(keepGoalInside(still(0, FIELD.halfWidth + 1), { x: 0, z: 1 }, 1).z).toBeLessThan(-0.9);
    expect(keepGoalInside(still(0, -FIELD.halfWidth - 1), { x: 1, z: 0 }, 1).z).toBeGreaterThan(0.9);
    expect(keepGoalInside(still(FIELD.endX + 1, 5), { x: 1, z: 0 }, 1).x).toBeLessThan(-0.9);
  });

  it("turns before the line when he is running at it flat out", () => {
    const fast = { x: 0, z: FIELD.halfWidth - 4.5, vx: 0, vz: 9 };
    expect(keepGoalInside(fast, { x: 0, z: 1 }, 1).z).toBeLessThan(0);
  });
});

describe("computer route runners", () => {
  it("come back inside when pushed out of bounds, and stay in", () => {
    const m = new Match({ entries: ROUTE_RUNNERS, seed: 4, firstOffense: 0, level: "hard" });
    snap(m);
    const wr = m.athletes.find((a) => a.team === 0 && a.role === "runner")!;
    run(m, 0.5);
    // Shoved out over the sideline mid route, still running at it.
    wr.z = FIELD.halfWidth + 2;
    wr.vz = 5;
    run(m, 1.6);
    expect(m.phase).toBe("live");
    expect(isOut(wr)).toBe(false);
    for (let t = 0; t < 2 && m.phase === "live"; t += STEP) {
      run(m, STEP);
      expect(isOut(wr)).toBe(false);
    }
    expect(bySeat(m, 0).id).toBe(m.carrier()?.id);
  });

  it("never run out of bounds before the ball is thrown, over whole computer games", () => {
    let looked = 0;
    for (const seed of [11, 12, 13]) {
      const m = new Match({ entries: BOTS, seed, level: "hard", quarterSeconds: 45, target: 999 });
      for (let s = 0; s < 60 * 60 * 6 && m.phase !== "over"; s++) {
        m.step(STEP);
        m.drainEvents();
        const play = m.play;
        // Only route running counts: a pass call with the QB still holding the ball. Once it is up a receiver chases it, even out of bounds.
        if (m.phase !== "live" || !play || play.call !== "throw" || play.passed || play.qbRun || m.ball.state !== "held") continue;
        for (const a of m.athletes) {
          if (a.team !== m.offense || (a.role !== "runner" && !a.deep) || a === m.carrier()) continue;
          looked++;
          // A shove can nudge a man a hand's width over before he steps back in.
          expect(isOut(a, 0.2)).toBe(false);
        }
      }
    }
    expect(looked).toBeGreaterThan(10_000);
  }, 60_000);
});
