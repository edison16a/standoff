import { describe, expect, it } from "vitest";
import { baseOf, FIELD, onField, PIECES, pieceDistance, spawnPoints, TALL } from "./arena";
import { BODY } from "./tuning";

const mirror = (x: number, z: number) => PIECES.find((p) => Math.abs(p.x + x) < 1e-9 && Math.abs(p.z + z) < 1e-9);

describe("the field", () => {
  it("is the same from both ends: every piece has its twin half a turn round", () => {
    for (const p of PIECES) {
      const twin = mirror(p.x, p.z);
      expect(twin, `${p.kind} at ${p.x},${p.z}`).toBeDefined();
      expect(twin!.kind).toBe(p.kind);
      expect(twin!.shape).toEqual(p.shape);
      expect(twin!.h).toBe(p.h);
    }
  });

  it("keeps every piece on the field with room to run between them", () => {
    for (const p of PIECES) {
      expect(onField({ x: p.x, z: p.z }, 1)).toBe(true);
      for (const q of PIECES) {
        if (q === p) continue;
        // Nothing overlaps: the centre of one piece is always outside the other.
        expect(pieceDistance(p, { x: q.x, z: q.z })).toBeGreaterThan(0.3);
      }
    }
  });

  it("mixes low bunkers, tall ones and a lane down one side", () => {
    const low = PIECES.filter((p) => p.h < TALL);
    const tall = PIECES.filter((p) => p.h >= TALL);
    expect(low.length).toBeGreaterThan(8);
    expect(tall.length).toBeGreaterThan(6);
    for (const kind of ["can", "dorito", "cake", "brick", "snake", "tower", "barrel", "wall"]) {
      expect(PIECES.some((p) => p.kind === kind)).toBe(true);
    }
  });

  it("hides a crouched head below every low bunker, and shows a standing one over it", () => {
    for (const p of PIECES.filter((q) => q.h < TALL)) {
      expect(BODY.crouchHead + BODY.headRadius).toBeLessThan(p.h);
      expect(BODY.standHead - BODY.headRadius).toBeGreaterThan(p.h);
    }
  });

  it("starts the sides at opposite ends, mirrored", () => {
    for (const count of [1, 2]) {
      const a = spawnPoints(0, count);
      const b = spawnPoints(1, count);
      expect(a).toHaveLength(count);
      a.forEach((p, i) => {
        expect(p.z).toBeLessThan(-FIELD.halfLength + 3);
        expect(b[i]).toEqual({ x: -p.x, z: -p.z });
      });
    }
    expect(baseOf(0).z).toBe(-baseOf(1).z);
  });

  it("measures distance to a piece, negative inside", () => {
    const can = PIECES.find((p) => p.kind === "can")!;
    expect(pieceDistance(can, { x: can.x, z: can.z })).toBeLessThan(0);
    expect(pieceDistance(can, { x: can.x + 2, z: can.z })).toBeCloseTo(2 - 0.75);
    const wall = PIECES.find((p) => p.kind === "wall")!;
    expect(pieceDistance(wall, { x: wall.x, z: wall.z + 1.25 })).toBeCloseTo(1);
  });
});
