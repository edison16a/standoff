import { describe, expect, it } from "vitest";
import { Points, POWER_POINTS } from "./points";
import { Run } from "./run";
import { COIN } from "./tuning";

/** A practice run (an empty yard at a jog) scaled like a difficulty, with coins and a power up down the middle. */
function scored(scale: number): Run {
  const run = new Run(1, { practice: true, scoreScale: scale });
  for (let z = 5; z < 20; z += 3) run.course.addCoin(0, COIN.y, z);
  run.course.pickups.push({ id: 900, kind: "magnet", lane: 0, y: 1.15, z: 24 });
  for (let t = 0; t < 6; t += 1 / 60) run.update(1 / 60);
  return run;
}

describe("the score", () => {
  it("adds every coin and power up on top of the distance", () => {
    const run = scored(1);
    expect(run.coins).toBe(5);
    expect(run.points.coins).toBe(5 * COIN.points);
    expect(run.points.powers).toBe(POWER_POINTS);
    expect(run.points.running).toBeCloseTo(run.runner.distance, 5);
    expect(run.score).toBeCloseTo(run.runner.distance + 5 * COIN.points + POWER_POINTS, 5);
  });

  it("multiplies every part by the difficulty", () => {
    const easy = scored(1);
    const demon = scored(3);
    expect(demon.points.coins).toBe(3 * easy.points.coins);
    expect(demon.points.powers).toBe(3 * easy.points.powers);
    expect(demon.score).toBeCloseTo(3 * easy.score, 5);
  });

  it("multiplies by the run's multiplier too", () => {
    const points = new Points(1.5);
    points.coin(2);
    points.power(4);
    points.ran(10, 3);
    expect(points.coins).toBe(COIN.points * 2 * 1.5);
    expect(points.powers).toBe(POWER_POINTS * 4 * 1.5);
    expect(points.running).toBe(45);
    expect(points.bonus).toBe(points.coins + points.powers);
    expect(points.total).toBe(points.bonus + 45);
  });

  it("gives nothing for a power up started by hand, as from the admin panel", () => {
    const run = new Run(1, { practice: true });
    run.grant("boots");
    expect(run.points.powers).toBe(0);
  });
});
