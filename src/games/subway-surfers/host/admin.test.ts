import { describe, expect, it } from "vitest";
import { Run } from "../engine/run";
import { ZONE_LENGTH } from "../engine/tuning";
import { adminShortcuts } from "./admin";

const find = (actions: ReturnType<typeof adminShortcuts>, id: string) => actions.find((a) => a.id === id)!;

describe("admin shortcuts", () => {
  it("start any power up on the run going", () => {
    const run = new Run(4);
    const actions = adminShortcuts(() => run);
    find(actions, "power-jetpack").run();
    find(actions, "power-double").run();
    expect(run.powers.has("jetpack")).toBe(true);
    expect(run.powers.has("double")).toBe(true);
  });

  it("jump to the start of the next zone, passing through anything there", () => {
    const run = new Run(4);
    run.update(1);
    const next = find(adminShortcuts(() => run), "next-zone");
    next.run();
    expect(run.runner.distance).toBeGreaterThanOrEqual(ZONE_LENGTH);
    expect(run.runner.distance).toBeLessThan(ZONE_LENGTH + 20);
    expect(run.runner.ghost).toBeGreaterThan(0);
    // The multiplier steps up on the next step, as it would have on foot.
    run.update(0.05);
    expect(run.level).toBe(2);
    expect(run.crashed).toBeNull();
  });

  it("do nothing between runs or after a crash", () => {
    const run = new Run(4);
    run.update(0.1);
    run.powers.end("jetpack");
    Object.assign(run, { crashed: { cause: "train", time: 0, obstacleId: null } });
    find(adminShortcuts(() => run), "power-jetpack").run();
    expect(run.powers.has("jetpack")).toBe(false);
    expect(() => find(adminShortcuts(() => null), "next-zone").run()).not.toThrow();
  });
});
