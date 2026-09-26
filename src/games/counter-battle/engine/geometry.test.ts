import { describe, expect, it } from "vitest";
import type { Piece } from "./arena";
import { pathBlocked, rayBox, rayCylinder, rayPiece, raySphere, sightBlocked } from "./geometry";

const FWD = { x: 0, y: 0, z: 1 };
const can: Piece = { id: 0, kind: "can", x: 0, z: 5, shape: { type: "circle", r: 1 }, h: 1.8 };
const brick: Piece = { id: 1, kind: "brick", x: 0, z: 5, shape: { type: "box", hw: 1, hd: 0.5 }, h: 1.1 };

describe("ray tests", () => {
  it("meet an upright cylinder on its side, and pass over its top", () => {
    expect(rayCylinder({ x: 0, y: 1, z: 0 }, FWD, 0, 5, 1, 0, 1.8)).toBeCloseTo(4);
    expect(rayCylinder({ x: 0, y: 2, z: 0 }, FWD, 0, 5, 1, 0, 1.8)).toBeNull();
    expect(rayCylinder({ x: 3, y: 1, z: 0 }, FWD, 0, 5, 1, 0, 1.8)).toBeNull();
  });

  it("meet a cylinder's top when coming down onto it", () => {
    const d = { x: 0, y: -Math.SQRT1_2, z: Math.SQRT1_2 };
    const t = rayCylinder({ x: 0, y: 3, z: 3.5 }, d, 0, 5, 1, 0, 1.8);
    expect(t).not.toBeNull();
    expect(3 + d.y * t!).toBeCloseTo(1.8);
  });

  it("meet a box face, and never from inside it", () => {
    expect(rayBox({ x: 0, y: 0.5, z: 0 }, FWD, { x: -1, y: 0, z: 4.5 }, { x: 1, y: 1.1, z: 5.5 })).toBeCloseTo(4.5);
    expect(rayBox({ x: 0, y: 0.5, z: 5 }, FWD, { x: -1, y: 0, z: 4.5 }, { x: 1, y: 1.1, z: 5.5 })).toBeNull();
    expect(rayBox({ x: 0, y: 1.5, z: 0 }, FWD, { x: -1, y: 0, z: 4.5 }, { x: 1, y: 1.1, z: 5.5 })).toBeNull();
  });

  it("meet a sphere", () => {
    expect(raySphere({ x: 0, y: 0, z: 0 }, FWD, { x: 0, y: 0, z: 10 }, 0.5)).toBeCloseTo(9.5);
    expect(raySphere({ x: 0, y: 0.6, z: 0 }, FWD, { x: 0, y: 0, z: 10 }, 0.5)).toBeNull();
  });

  it("dispatch on the piece's shape", () => {
    expect(rayPiece({ x: 0, y: 1, z: 0 }, FWD, can)).toBeCloseTo(4);
    expect(rayPiece({ x: 0, y: 1, z: 0 }, FWD, brick)).toBeCloseTo(4.5);
  });
});

describe("sight and paths", () => {
  it("is blocked by cover between two points and clear over low cover", () => {
    expect(sightBlocked({ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 10 }, [brick])).toBe(true);
    expect(sightBlocked({ x: 0, y: 1.6, z: 0 }, { x: 0, y: 1.6, z: 10 }, [brick])).toBe(false);
    expect(sightBlocked({ x: 0, y: 1.6, z: 0 }, { x: 0, y: 1.6, z: 10 }, [can])).toBe(true);
  });

  it("treats a runner as round, so a path that brushes a piece is blocked", () => {
    expect(pathBlocked({ x: -3, z: 5 }, { x: 3, z: 5 }, [can], 0.3)).toBe(true);
    expect(pathBlocked({ x: -3, z: 6.2 }, { x: 3, z: 6.2 }, [can], 0.3)).toBe(true);
    expect(pathBlocked({ x: -3, z: 6.5 }, { x: 3, z: 6.5 }, [can], 0.3)).toBe(false);
  });
});
