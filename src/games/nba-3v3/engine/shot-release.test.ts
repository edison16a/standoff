import { describe, expect, it } from "vitest";
import { traceShot } from "./physics/shot-watch";
import { seeded } from "./rng";
import type { Family } from "./shot-calibration";
import { planRelease, type ReleaseInput } from "./shot-release";
import { RIM } from "./tuning";

/** Shots from spots a little off the ones the table was measured at, as in a game. */
const SHOTS: { input: ReleaseInput; distance: number }[] = [
  { input: { family: "jumper", from: { x: 2.2, y: 2.85, z: 8.3 }, apex: RIM.y + 0.95 + 7 * 0.12, spinRate: 15 }, distance: 7 },
  { input: { family: "jumper", from: { x: -3.6, y: 2.6, z: 3.9 }, apex: RIM.y + 0.95 + 4.1 * 0.12, spinRate: 14 }, distance: 4.1 },
  { input: { family: "free", from: { x: 0.1, y: 2.5, z: 6.05 }, apex: RIM.y + 1.5, spinRate: 16 }, distance: 4.5 },
  { input: { family: "floater", from: { x: -0.8, y: 2.6, z: 4.6 }, apex: RIM.y + 1.4, spinRate: 4 }, distance: 3.1 },
  { input: { family: "layup", from: { x: -0.25, y: 3.05, z: 2.2 }, apex: 3.45, spinRate: 6 }, distance: 0.8 },
  { input: { family: "bank", from: { x: -0.45, y: 2.95, z: 1.97 }, apex: 3.4, spinRate: 7 }, distance: 0.8 },
  { input: { family: "dunk", from: { x: 0.1, y: RIM.y + 0.24, z: RIM.z + 0.14 }, apex: RIM.y + 0.24, spinRate: 0 }, distance: 0.5 },
];

function rate(input: ReleaseInput, chance: number, distance: number, n: number): { rate: number; families: Set<Family> } {
  const rng = seeded(Math.round(chance * 100) + input.from.x * 10);
  let made = 0;
  const families = new Set<Family>();
  for (let i = 0; i < n; i++) {
    const launch = planRelease(rng, input, chance, distance);
    families.add(launch.family);
    if (traceShot({ pos: { ...input.from }, vel: launch.vel, w: launch.spin }).made) made++;
  }
  return { rate: made / n, families };
}

describe("a release with its error", () => {
  it("drops about as often as the shot model says, for every kind of shot", () => {
    for (const { input, distance } of SHOTS) {
      for (const chance of [0.35, 0.65, 0.92]) {
        const got = rate(input, chance, distance, 260).rate;
        expect(Math.abs(got - chance), `${input.family} at ${chance}: ${got}`).toBeLessThan(0.1);
      }
    }
  }, 120000);

  it("banks a layup off the glass from the wing", () => {
    const bank = SHOTS.find((s) => s.input.family === "bank")!;
    expect(rate(bank.input, 0.8, bank.distance, 10).families.has("bank")).toBe(true);
  });
});
