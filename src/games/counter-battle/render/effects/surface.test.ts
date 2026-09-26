import { describe, expect, it } from "vitest";
import type { Piece } from "../../engine/arena";
import { surfaceNormal } from "./surface";

const can: Piece = { id: 0, kind: "can", x: 2, z: 3, shape: { type: "circle", r: 0.75 }, h: 1.85 };
const brick: Piece = { id: 1, kind: "brick", x: -1, z: 0, shape: { type: "box", hw: 0.95, hd: 0.55 }, h: 1.15 };

describe("splats lie flat on the surface they hit", () => {
  it("face out from the side of a round bunker, and up from its top", () => {
    const n = surfaceNormal(can, { x: 2, y: 1, z: 3 - 0.75 });
    expect(n).toEqual({ x: 0, y: 0, z: -1 });
    expect(surfaceNormal(can, { x: 2.3, y: 1.85, z: 3 })).toEqual({ x: 0, y: 1, z: 0 });
  });

  it("face out from whichever face of a block was hit", () => {
    expect(surfaceNormal(brick, { x: -1 + 0.95, y: 0.6, z: 0.1 })).toEqual({ x: 1, y: 0, z: 0 });
    expect(surfaceNormal(brick, { x: -1.2, y: 0.6, z: -0.55 })).toEqual({ x: 0, y: 0, z: -1 });
    expect(surfaceNormal(brick, { x: -1.2, y: 1.14, z: 0 })).toEqual({ x: 0, y: 1, z: 0 });
  });
});
