import { describe, expect, it } from "vitest";
import { ATLAS_GRID, DRIP_FROM, drawDecalAtlas, TILE_COUNT } from "./decal-atlas";

const SIZE = 256;
const CELL = SIZE / ATLAS_GRID;
const atlas = drawDecalAtlas(SIZE);
const at = (tile: number, i: number, j: number, channel: number) => {
  const x = (tile % ATLAS_GRID) * CELL + i;
  const y = Math.floor(tile / ATLAS_GRID) * CELL + j;
  return atlas[(y * SIZE + x) * 4 + channel]!;
};

describe("the paint splat atlas", () => {
  it("draws a solid splat in the middle of every cell", () => {
    for (let tile = 0; tile < TILE_COUNT; tile++) expect(at(tile, CELL / 2, CELL / 2, 3)).toBeGreaterThan(200);
  });

  it("leaves every cell's border clear, so splats never bleed into each other", () => {
    for (let tile = 0; tile < TILE_COUNT; tile++) {
      for (let k = 0; k < CELL; k++) {
        expect(at(tile, k, 0, 3)).toBe(0);
        expect(at(tile, 0, k, 3)).toBe(0);
        expect(at(tile, k, CELL - 1, 3)).toBe(0);
        expect(at(tile, CELL - 1, k, 3)).toBe(0);
      }
    }
  });

  it("gives drips only to the wall splats, running down from the splat", () => {
    const dripsIn = (tile: number) => {
      let low = 0;
      let high = 0;
      for (let j = 0; j < CELL; j++) for (let i = 0; i < CELL; i++) if (at(tile, i, j, 1) > 0 && at(tile, i, j, 3) > 0) j > CELL / 2 ? low++ : high++;
      return { low, high };
    };
    for (let tile = 0; tile < DRIP_FROM; tile++) expect(dripsIn(tile).low + dripsIn(tile).high).toBe(0);
    for (let tile = DRIP_FROM; tile < TILE_COUNT; tile++) {
      const { low, high } = dripsIn(tile);
      expect(low).toBeGreaterThan(0);
      expect(low).toBeGreaterThan(high);
    }
  });

  it("draws the same atlas every time", () => {
    expect(drawDecalAtlas(SIZE)).toEqual(atlas);
  });
});
