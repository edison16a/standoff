import { describe, expect, it } from "vitest";
import { chaserAt, CHASERS, REAR, shotsBetween, targetFor, truckAt } from "./story";

const tailgate = (s: number) => -truckAt(s) + REAR;

describe("the chase", () => {
  it("keeps every running chaser behind the tailgate", () => {
    for (let s = 0; s <= 9; s += 0.1) {
      for (const c of CHASERS) {
        const pose = chaserAt(c, s);
        if (pose.state === "run") expect(pose.z).toBeGreaterThan(tailgate(s) + 1);
      }
    }
  });

  it("hides each doorway's runners until they burst out", () => {
    for (const c of CHASERS.filter((c) => c.burst)) {
      expect(chaserAt(c, c.burst!.at - 0.01).state).toBe("hidden");
      const out = chaserAt(c, c.burst!.at + 0.01);
      expect(out.state).toBe("run");
      expect(out.x).toBeCloseTo(c.burst!.x, 0);
    }
  });

  it("bursts out only once the truck has gone by", () => {
    for (const c of CHASERS.filter((c) => c.burst)) expect(truckAt(c.burst!.at) - REAR).toBeGreaterThan(c.burst!.distance);
  });

  it("brings the leaper down on the road behind the truck", () => {
    const leaper = CHASERS.find((c) => c.leap !== undefined)!;
    const high = chaserAt(leaper, leaper.leap! + 0.3);
    expect(high.state).toBe("leap");
    expect(high.y).toBeGreaterThan(1);
    const down = chaserAt(leaper, leaper.leap! + 2);
    expect(down.state).toBe("dead");
    expect(down.y).toBe(0);
  });
});

describe("the gunfire", () => {
  it("gives every death its killing shot", () => {
    const shots = shotsBetween(0, 10);
    for (const c of CHASERS) {
      const dies = c.leap !== undefined || c.dies !== undefined;
      expect(shots.some((s) => s.kill && s.target === c.id)).toBe(dies);
    }
  });

  it("plays the same shots however the time is sliced", () => {
    const whole = shotsBetween(1, 7);
    const sliced = [...shotsBetween(1, 2.5), ...shotsBetween(2.5, 4.13), ...shotsBetween(4.13, 7)];
    expect(sliced).toEqual(whole);
  });

  it("only aims at the living", () => {
    for (let s = 0; s <= 9; s += 0.1) {
      for (const seat of [1, 2, 3, 4]) {
        const id = targetFor(seat, s);
        if (id === null) continue;
        const state = chaserAt(CHASERS.find((c) => c.id === id)!, s).state;
        expect(["run", "leap"]).toContain(state);
      }
    }
  });
});
