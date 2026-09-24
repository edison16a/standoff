import { describe, expect, it } from "vitest";
import { Sparks } from "./sparks";

describe("Sparks", () => {
  it("throws a burst that dies out on its own", () => {
    const sparks = new Sparks(() => 0.5);
    sparks.burst(1, 1, 0, { count: 20, speed: 4, lifeMs: 400 });
    const ctx = { save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} } as unknown as CanvasRenderingContext2D;
    sparks.draw(ctx, { accent: "#00f", text: "#000" }, 100, 0.01);
    expect(sparks.count).toBe(20);
    sparks.draw(ctx, { accent: "#00f", text: "#000" }, 1000, 0.01);
    expect(sparks.count).toBe(0);
  });
});
