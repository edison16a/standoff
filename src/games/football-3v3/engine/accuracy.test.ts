import { describe, expect, it } from "vitest";
import { looseness, missSpot } from "./accuracy";
import { createAthlete } from "./body";
import { Rng } from "./rng";
import { bySeat, peopleMatch, run, snap } from "./test-helpers";
import { ON_THE_RUN } from "./tuning";

describe("throwing on the run", () => {
  it("is clean with set feet and loose flat out, and a big arm steadies it", () => {
    const qb = createAthlete(0, 0, "qb", 0, "scrambler", 0);
    expect(looseness(qb)).toBe(0);
    qb.vx = ON_THE_RUN.full;
    const scrambler = looseness(qb);
    expect(scrambler).toBeGreaterThan(0.8);
    const gun = createAthlete(1, 0, "qb", 0, "gunslinger", 1);
    gun.vx = ON_THE_RUN.full;
    expect(looseness(gun)).toBeLessThan(scrambler);
  });

  it("leaves a clean throw alone and sprays a loose one farther on a long pass", () => {
    const rng = new Rng(3);
    const from = { x: 0, z: 0 };
    expect(missSpot({ x: 10, z: 0 }, from, 0, rng)).toEqual({ x: 10, z: 0 });
    const miss = (length: number) => {
      let total = 0;
      for (let i = 0; i < 200; i++) {
        const p = missSpot({ x: length, z: 0 }, from, 1, rng);
        total += Math.hypot(p.x - length, p.z);
      }
      return total / 200;
    };
    expect(miss(30)).toBeGreaterThan(miss(5));
    expect(miss(5)).toBeGreaterThan(0.8);
  });

  /** Throws to the receiver after a few seconds of routes, standing or on the run, and reports whether it was caught. */
  function throwAfterRoute(seed: number, running: boolean): boolean {
    const m = peopleMatch({ seed });
    snap(m);
    const qb = bySeat(m, 0);
    const wr = bySeat(m, 1);
    const d = bySeat(m, 3);
    m.setMove(wr.id, { x: m.sign, z: 0 });
    // Keep the defender out of it: this is about the throw alone.
    m.setMove(d.id, { x: 0, z: -Math.sign(wr.z || 1) });
    m.setMove(qb.id, running ? { x: 0, z: 1 } : { x: 0, z: 0 });
    run(m, 1.6);
    m.setAim(qb.id, { x: wr.x - qb.x, z: wr.z - qb.z });
    run(m, 0.05);
    m.setAim(qb.id, null);
    const events = run(m, 3, (mm) => mm.phase !== "live" || mm.play?.caughtBy !== null);
    return events.some((e) => e.type === "catch" && e.id === wr.id);
  }

  it("is caught far more often from a standstill than on the run", () => {
    let still = 0;
    let moving = 0;
    for (let seed = 1; seed <= 24; seed++) {
      if (throwAfterRoute(seed, false)) still++;
      if (throwAfterRoute(seed, true)) moving++;
    }
    expect(still).toBeGreaterThanOrEqual(22);
    expect(moving).toBeLessThan(still - 6);
  });
});
