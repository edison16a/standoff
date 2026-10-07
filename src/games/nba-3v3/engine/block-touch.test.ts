import { describe, expect, it } from "vitest";
import { fingertip } from "./blocks/hit";

describe("a hand on a shot", () => {
  const shoulder = { x: 0, y: 2.4, z: 0, reach: 0.8 };

  it("is a swat when the ball's path runs deep into the reach", () => {
    // Coming straight at the shoulder from the edge of the reach.
    expect(fingertip({ pos: { x: 0, y: 3.1, z: 0.4 }, vel: { x: 0, y: -6, z: -3 } }, shoulder)).toBe(false);
  });

  it("is only a fingertip when the path grazes the end of the reach", () => {
    // Passing by, its nearest point 0.75 m off the shoulder.
    expect(fingertip({ pos: { x: 0.75, y: 2.6, z: 0.5 }, vel: { x: 0, y: 0, z: -8 } }, shoulder)).toBe(true);
  });

  it("judges by where the path goes, not where the ball is when the hand first gets there", () => {
    const edge = { x: 0, y: 3.15, z: 0.25 };
    expect(fingertip({ pos: edge, vel: { x: 0, y: -8, z: -1 } }, shoulder)).toBe(false);
    expect(fingertip({ pos: edge, vel: { x: 0, y: 0, z: 8 } }, shoulder)).toBe(true);
  });
});
