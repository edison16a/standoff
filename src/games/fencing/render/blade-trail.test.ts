import { describe, expect, it } from "vitest";
import { BladeTrail } from "./blade-trail";

/** Just enough of a canvas to count the segments drawn. */
function fakeCanvas() {
  const drawn = { strokes: 0 };
  const ctx = {
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {
      drawn.strokes += 1;
    },
  } as unknown as CanvasRenderingContext2D;
  return { ctx, drawn };
}

describe("BladeTrail", () => {
  it("draws a streak behind a moving tip", () => {
    const trail = new BladeTrail();
    for (let i = 0; i < 6; i++) trail.add(i * 0.05, 1, i * 16);
    const { ctx, drawn } = fakeCanvas();
    trail.draw(ctx, "#000", 80, 0.01);
    expect(drawn.strokes).toBe(5);
  });

  it("draws nothing for a tip held still", () => {
    const trail = new BladeTrail();
    for (let i = 0; i < 6; i++) trail.add(0.5, 1, i * 16);
    const { ctx, drawn } = fakeCanvas();
    trail.draw(ctx, "#000", 80, 0.01);
    expect(drawn.strokes).toBe(0);
  });

  it("lets old points fade out and starts over when time runs backwards", () => {
    const trail = new BladeTrail();
    for (let i = 0; i < 6; i++) trail.add(i * 0.05, 1, i * 16);
    const faded = fakeCanvas();
    trail.draw(faded.ctx, "#000", 1000, 0.01);
    expect(faded.drawn.strokes).toBe(0);

    trail.add(0, 1, 5);
    const restarted = fakeCanvas();
    trail.draw(restarted.ctx, "#000", 5, 0.01);
    expect(restarted.drawn.strokes).toBe(0);
  });
});
