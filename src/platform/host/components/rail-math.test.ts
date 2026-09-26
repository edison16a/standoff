import { describe, expect, it } from "vitest";
import { copiesOff, railShift, shortStep, startShift, tileLeft, type RailSizes } from "./rail-math";

// A 1280 wide screen: 130 px tiles growing to 159 px, 16 px gaps, 48 px edges.
const sizes: RailSizes = { small: 130, large: 159, gap: 16, edge: 48, width: 1280 };
const pitch = sizes.small + sizes.gap;

describe("rail geometry", () => {
  it("places tiles by index", () => {
    expect(tileLeft(0, sizes)).toBe(48);
    expect(tileLeft(3, sizes)).toBe(48 + 3 * pitch);
  });

  it("starts with the chosen tile at the left edge", () => {
    const shift = startShift(11, sizes);
    expect(tileLeft(11, sizes) - shift).toBe(sizes.edge);
  });

  it("stays still while the chosen tile is in view", () => {
    const shift = startShift(11, sizes);
    for (let at = 11; at <= 17; at++) expect(railShift(at, shift, sizes)).toBe(shift);
  });

  it("centres the chosen tile once a move takes it past the right edge", () => {
    const shift = startShift(11, sizes);
    // Tile 19 is the first whose right side passes 1280 minus the edge.
    let at = 11;
    while (railShift(at + 1, shift, sizes) === shift) at++;
    const moved = railShift(at + 1, shift, sizes);
    const left = tileLeft(at + 1, sizes) - moved;
    expect(left + sizes.large / 2).toBeCloseTo(sizes.width / 2);
  });

  it("centres the chosen tile once a move takes it past the left edge", () => {
    const shift = startShift(11, sizes);
    const moved = railShift(10, shift, sizes);
    expect(tileLeft(10, sizes) - moved + sizes.large / 2).toBeCloseTo(sizes.width / 2);
  });

  it("then stays still again for moves either way inside the view", () => {
    const shift = railShift(10, startShift(11, sizes), sizes);
    expect(railShift(11, shift, sizes)).toBe(shift);
    expect(railShift(9, shift, sizes)).toBe(shift);
  });
});

describe("the endless loop", () => {
  it("steps the short way round", () => {
    expect(shortStep(10, 0, 11)).toBe(1);
    expect(shortStep(0, 10, 11)).toBe(-1);
    expect(shortStep(3, 5, 11)).toBe(2);
    expect(shortStep(5, 5, 11)).toBe(0);
  });

  it("knows how far a tile is from the middle copy", () => {
    expect(copiesOff(33, 11, 7)).toBe(0);
    expect(copiesOff(43, 11, 7)).toBe(0);
    expect(copiesOff(44, 11, 7)).toBe(1);
    expect(copiesOff(32, 11, 7)).toBe(-1);
    expect(copiesOff(21, 11, 7)).toBe(-2);
  });
});
