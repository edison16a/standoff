import { describe, expect, it } from "vitest";
import { budget, BUDGET_MS, measure } from "./frame-budget";

describe("the frame budget", () => {
  it("draws fewer pixels while frames run long, never below six tenths", () => {
    const b = budget();
    for (let i = 0; i < 400; i++) measure(b, 30);
    expect(b.scale).toBeCloseTo(0.6, 5);
  });

  it("holds steady inside the budget and comes back up once there is room", () => {
    const b = budget();
    for (let i = 0; i < 200; i++) measure(b, BUDGET_MS - 1);
    expect(b.scale).toBe(1);
    for (let i = 0; i < 400; i++) measure(b, 25);
    const low = b.scale;
    for (let i = 0; i < 2000; i++) measure(b, 4);
    expect(b.scale).toBeGreaterThan(low);
    expect(b.scale).toBe(1);
  });

  it("ignores a single slow frame", () => {
    const b = budget();
    for (let i = 0; i < 100; i++) measure(b, 8);
    measure(b, 60);
    for (let i = 0; i < 10; i++) measure(b, 8);
    expect(b.scale).toBe(1);
  });
});
