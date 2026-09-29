import { describe, expect, it } from "vitest";
import { advance, downText, fieldGoalYards, goalToGo, inFieldGoalRange, newDrive, toGo } from "./downs";

describe("downs and distance", () => {
  it("starts at first and ten", () => {
    const d = newDrive(0, 25);
    expect(d.down).toBe(1);
    expect(toGo(d)).toBe(10);
    expect(downText(d)).toBe("1st and 10");
  });

  it("moves to the next down when short of the line", () => {
    const { drive, result } = advance(newDrive(0, 25), 29, 0);
    expect(result).toBe("nextDown");
    expect(drive.down).toBe(2);
    expect(toGo(drive)).toBeCloseTo(6);
    expect(downText(drive)).toBe("2nd and 6");
  });

  it("gives a fresh set of downs past the line", () => {
    const { drive, result } = advance({ ...newDrive(1, 40), down: 3 }, 52, 2);
    expect(result).toBe("firstDown");
    expect(drive.down).toBe(1);
    expect(drive.firstDownAt).toBe(62);
    expect(drive.ballZ).toBe(2);
  });

  it("hands the ball over after failing on fourth down", () => {
    const { drive, result } = advance({ ...newDrive(0, 60), down: 4 }, 65, 0);
    expect(result).toBe("turnover");
    expect(drive.offense).toBe(1);
    expect(drive.los).toBe(35);
    expect(drive.down).toBe(1);
  });

  it("makes the goal line the line to gain inside the ten", () => {
    const d = newDrive(0, 94);
    expect(goalToGo(d)).toBe(true);
    expect(downText(d)).toBe("1st and goal");
    expect(downText({ ...d, firstDownAt: 94.2 })).toBe("1st and inches");
  });

  it("never spots the ball in an end zone", () => {
    expect(advance(newDrive(0, 5), -3, 0).drive.los).toBe(1);
  });

  it("knows field goal range", () => {
    expect(fieldGoalYards(newDrive(0, 70))).toBe(47);
    expect(inFieldGoalRange(newDrive(0, 70))).toBe(true);
    expect(inFieldGoalRange(newDrive(0, 45))).toBe(false);
  });
});
