import { describe, expect, it } from "vitest";
import { QualityGovernor } from "./quality";

function run(governor: QualityGovernor, ms: number, seconds: number): void {
  for (let t = 0; t < seconds * 1000; t += ms) governor.frame(ms);
}

describe("quality governor", () => {
  it("keeps full resolution while frames keep up", () => {
    const governor = new QualityGovernor(1.5);
    run(governor, 16.7, 20);
    expect(governor.ratio).toBe(1.5);
  });

  it("drops resolution while frames run slow, down to a floor", () => {
    const governor = new QualityGovernor(1.5);
    run(governor, 40, 30);
    expect(governor.ratio).toBe(0.5);
  });

  it("sharpens again once there is room, but backs off from flip flopping", () => {
    const governor = new QualityGovernor(1);
    run(governor, 40, 2);
    expect(governor.ratio).toBe(0.75);
    run(governor, 16.7, 9);
    expect(governor.ratio).toBe(1);
    run(governor, 40, 2);
    expect(governor.ratio).toBe(0.75);
    run(governor, 16.7, 9);
    expect(governor.ratio).toBe(0.75);
  });
});
