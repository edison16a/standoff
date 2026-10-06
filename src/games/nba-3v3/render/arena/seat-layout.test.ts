import { describe, expect, it } from "vitest";
import { AISLE, BLOCK, layoutSeats, SEAT, treadY } from "./seat-layout";

describe("layoutSeats", () => {
  const section = { x: 0, z: -5, yaw: 0, width: 34, rows: 4 };

  it("fills whole blocks that fit the section, split by aisles", () => {
    const { seats, aisles } = layoutSeats([section]);
    const blocks = aisles.length + 1;
    expect(blocks).toBe(Math.round((34 + AISLE) / (BLOCK * SEAT + AISLE)));
    const perRow = seats.length / 4;
    // The seats and aisles fill all but less than one seat of each block's share.
    expect(perRow * SEAT + (blocks - 1) * AISLE).toBeGreaterThan(34 - blocks * SEAT);
    expect(perRow * SEAT + (blocks - 1) * AISLE).toBeLessThanOrEqual(34);
  });

  it("keeps every seat inside the section and out of the aisles", () => {
    const { seats, aisles } = layoutSeats([section]);
    for (const s of seats) {
      expect(Math.abs(s.x)).toBeLessThan(17);
      for (const a of aisles) expect(Math.abs(s.x - a.x)).toBeGreaterThanOrEqual(AISLE / 2 + SEAT / 2 - 0.05);
    }
  });

  it("steps each row back and up", () => {
    const { seats } = layoutSeats([section]);
    const first = seats.find((s) => s.row === 0)!;
    const last = seats.find((s) => s.row === 3)!;
    expect(last.z).toBeLessThan(first.z);
    expect(last.y).toBeCloseTo(treadY(3));
  });

  it("is the same every time for one seed", () => {
    expect(layoutSeats([section], 5).seats.map((s) => s.luck)).toEqual(layoutSeats([section], 5).seats.map((s) => s.luck));
  });
});
