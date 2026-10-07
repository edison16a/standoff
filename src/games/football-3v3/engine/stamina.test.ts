import { describe, expect, it } from "vitest";
import { createAthlete, freshSpeed, topSpeed } from "./body";
import { STAMINA, staminaPace, updateStamina } from "./stamina";
import { bySeat, peopleMatch, run, snap } from "./test-helpers";

const runner = () => createAthlete(0, 0, "runner", 0, "speedster", null);

describe("stamina", () => {
  it("drains faster sprinting than running, and comes back walking, standing and between plays", () => {
    const sprint = runner();
    const jog = runner();
    for (let i = 0; i < 60; i++) {
      updateStamina(sprint, 0.95, true, 1 / 60);
      updateStamina(jog, 0.5, true, 1 / 60);
    }
    expect(1 - sprint.stamina).toBeCloseTo(STAMINA.sprint, 3);
    expect(1 - jog.stamina).toBeLessThan((1 - sprint.stamina) / 2);
    for (const [ratio, live] of [[0.3, true], [0, true], [0.9, false]] as const) {
      const a = runner();
      a.stamina = 0.5;
      updateStamina(a, ratio, live, 1);
      expect(a.stamina).toBeGreaterThan(0.5);
    }
  });

  it("leaves top speed alone until tired, then slows a spent runner by over a quarter", () => {
    const a = runner();
    const fresh = topSpeed(a, true);
    a.stamina = STAMINA.tired + 0.05;
    expect(topSpeed(a, true)).toBeCloseTo(fresh, 6);
    a.stamina = 0;
    expect(staminaPace(a)).toBe(STAMINA.floor);
    expect(topSpeed(a, true) / fresh).toBeLessThan(0.75);
    expect(freshSpeed(a)).toBeGreaterThan(topSpeed(a, false));
  });

  it("tires a receiver on a long sprint so he runs slower at the end of it than at the start", () => {
    // A clear lane: no support players, and the one defender who could meet him out of the way.
    const m = peopleMatch({ support: 0 });
    snap(m);
    const wr = bySeat(m, 1);
    bySeat(m, 3).z = 25;
    m.setMove(wr.id, { x: m.sign, z: 0 });
    let peak = 0;
    run(m, 8, () => {
      peak = Math.max(peak, Math.hypot(wr.vx, wr.vz));
      return false;
    });
    expect(wr.stamina).toBeLessThan(0.3);
    expect(Math.hypot(wr.vx, wr.vz)).toBeLessThan(peak * 0.92);
  });
});
