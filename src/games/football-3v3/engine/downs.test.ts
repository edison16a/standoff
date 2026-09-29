import { describe, expect, it } from "vitest";
import { advanceDowns, downLabel, driveFrom, firstDownLine, goalToGo, newDrive, toGo } from "./downs";
import { spotLabel, xFromGoal, yardsToGoal } from "./field";
import type { MatchState } from "./types";

/** Just enough of a match for the chains. */
function at(drive = driveFrom(0, 25)): MatchState {
  return { drive, events: [] } as unknown as MatchState;
}

describe("downs", () => {
  it("start first and ten from the own 25", () => {
    const d = driveFrom(0, 25);
    expect(yardsToGoal(0, d.los)).toBe(75);
    expect(downLabel(d)).toBe("1st & 10");
    expect(spotLabel(0, d.los)).toBe("OWN 25");
  });

  it("move the chains when the ball reaches the line", () => {
    const s = at();
    expect(advanceDowns(s, s.drive.los + 4, 0)).toBe("next");
    expect(downLabel(s.drive)).toBe("2nd & 6");
    expect(advanceDowns(s, s.drive.los + 7, 0)).toBe("first");
    expect(downLabel(s.drive)).toBe("1st & 10");
  });

  it("turn the ball over after a failed fourth down, where it lies", () => {
    const s = at();
    for (let i = 0; i < 3; i++) advanceDowns(s, s.drive.los, 0);
    expect(s.drive.down).toBe(4);
    const spot = s.drive.los + 2;
    expect(advanceDowns(s, spot, 5)).toBe("turnover");
    expect(s.drive.offense).toBe(1);
    expect(s.drive.los).toBe(spot);
    expect(Math.abs(s.drive.ballZ)).toBeLessThan(3.1);
    expect(s.events.some((e) => e.type === "turnover")).toBe(true);
  });

  it("goes to goal to go inside the ten, both ways", () => {
    for (const team of [0, 1] as const) {
      const d = newDrive(team, xFromGoal(team, 6));
      expect(goalToGo(d)).toBe(true);
      expect(downLabel(d)).toBe("1st & Goal");
      expect(firstDownLine(team, xFromGoal(team, 30))).toBeCloseTo(xFromGoal(team, 20));
    }
  });

  it("counts a loss as yards still to go", () => {
    const s = at();
    advanceDowns(s, s.drive.los - 3, 0);
    expect(toGo(s.drive)).toBe(13);
  });
});
