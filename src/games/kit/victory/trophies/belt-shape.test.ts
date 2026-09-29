import { describe, expect, it } from "vitest";
import { bendAt, bendVertex } from "./belt-shape";

const bend = { flat: 0.3, radius: 0.15 };

describe("belt bending", () => {
  it("leaves the middle flat", () => {
    for (const x of [-0.3, -0.1, 0, 0.2, 0.3]) expect(bendAt(x, bend)).toEqual({ x, z: 0, angle: 0 });
  });

  it("curls both ends back behind the face, the same on each side", () => {
    const right = bendAt(0.5, bend);
    const left = bendAt(-0.5, bend);
    expect(right.z).toBeLessThan(0);
    expect(left.z).toBeCloseTo(right.z);
    expect(left.x).toBeCloseTo(-right.x);
    expect(left.angle).toBeCloseTo(-right.angle);
  });

  it("keeps the leather's length as it bends", () => {
    let length = 0;
    let last = bendAt(0, bend);
    for (let i = 1; i <= 500; i++) {
      const next = bendAt((i / 500) * 0.55, bend);
      length += Math.hypot(next.x - last.x, next.z - last.z);
      last = next;
    }
    expect(length).toBeCloseTo(0.55, 3);
  });

  it("bends smoothly with no kink where the curl starts", () => {
    const before = bendAt(0.2999, bend);
    const after = bendAt(0.3001, bend);
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(0.0003);
    expect(Math.abs(after.angle)).toBeLessThan(0.002);
  });

  it("moves the face of the strap out along its turned normal", () => {
    const quarter = bendAt(0.3 + (Math.PI / 2) * 0.15, bend);
    const face = bendVertex(0.3 + (Math.PI / 2) * 0.15, 0.01, bend);
    // A quarter turn round, the face looks out along +x.
    expect(face.x - quarter.x).toBeCloseTo(0.01);
    expect(face.z - quarter.z).toBeCloseTo(0);
  });

  it("stays straight with an endless radius", () => {
    expect(bendAt(0.5, { flat: 0.1, radius: Infinity })).toEqual({ x: 0.5, z: 0, angle: 0 });
  });
});
