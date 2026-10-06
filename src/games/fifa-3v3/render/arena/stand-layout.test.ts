import { describe, expect, it } from "vitest";
import { PITCH } from "../../engine/tuning";
import { inAisle, seats, standPoint, STANDS } from "./stand-layout";

describe("the stands", () => {
  const all = seats();

  it("seats a full house without anyone on the pitch or in the catch nets", () => {
    expect(all.length).toBeGreaterThan(3000);
    expect(all.length).toBeLessThan(5000);
    for (const s of all) {
      const outside = Math.abs(s.x) > PITCH.halfLength + PITCH.catchNet || Math.abs(s.z) > PITCH.halfWidth + 3;
      expect(outside).toBe(true);
    }
  });

  it("climbs away from the pitch, row on row", () => {
    const main = STANDS[0]!;
    const front = standPoint(main, 0, 0, 0);
    const back = standPoint(main, 0, 10, 0);
    expect(Math.abs(back.z)).toBeGreaterThan(Math.abs(front.z));
    const end = STANDS[3]!;
    expect(standPoint(end, 0, 10, 0).x).toBeGreaterThan(standPoint(end, 0, 0, 0).x);
  });

  it("leaves the aisles empty", () => {
    const main = STANDS[0]!;
    const aisles: number[] = [];
    for (let a = -main.half; a < main.half; a += 0.05) if (inAisle(main, a)) aisles.push(a);
    expect(aisles.length).toBeGreaterThan(20);
    const fans = all.filter((s) => s.z < main.front + 0.1 && Math.abs(s.x) < main.half);
    for (const s of fans) expect(inAisle(main, s.x)).toBe(false);
  });

  it("puts each team's fans at their own end", () => {
    const left = all.filter((s) => s.x < -PITCH.halfLength - 5);
    expect(left.every((s) => s.side === 0)).toBe(true);
  });
});
