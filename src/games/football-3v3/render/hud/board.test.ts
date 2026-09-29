import { describe, expect, it } from "vitest";
import { freshView } from "../test-views";
import { clockText, scoreboard, spotText } from "./board";

describe("scoreboard", () => {
  it("shows the quarter, the clock, the down and the target", () => {
    const v = freshView();
    v.phase = "presnap";
    v.quarter = 2;
    v.clock = 83.2;
    v.score = [7, 3];
    const b = scoreboard(v);
    expect(b.period).toBe("2nd");
    expect(b.clock).toBe("1:24");
    expect(b.teams.map((t) => t.score)).toEqual([7, 3]);
    expect(b.situation).toBe(v.drive.text);
    expect(b.target).toBe("First to 14");
  });

  it("marks the side with the ball", () => {
    const v = freshView();
    v.drive = { ...v.drive, offense: 1 };
    const b = scoreboard(v);
    expect(b.teams[1].ball).toBe(true);
    expect(b.teams[0].ball).toBe(false);
  });

  it("says where the ball is from the nearer goal", () => {
    const v = freshView();
    v.drive = { ...v.drive, offense: 0, yardline: 25 };
    expect(spotText(v)).toBe("STM 25");
    v.drive = { ...v.drive, offense: 0, yardline: 70 };
    expect(spotText(v)).toBe("BLZ 30");
    v.drive = { ...v.drive, offense: 1, yardline: 50 };
    expect(spotText(v)).toBe("50");
  });

  it("names kicks, touchdowns, overtime and the final", () => {
    const v = freshView();
    v.phase = "touchdown";
    expect(scoreboard(v).situation).toBe("Touchdown");
    v.phase = "over";
    v.winner = 1;
    expect(scoreboard(v).situation).toBe("Blaze win");
    expect(scoreboard(v).period).toBe("Final");
    v.phase = "live";
    v.overtime = true;
    expect(scoreboard(v).period).toBe("OT");
  });

  it("calls a try by what it was, even in the walk back after it", () => {
    const v = freshView();
    v.drive = { ...v.drive, conversion: true };
    v.phase = "presnap";
    expect(scoreboard(v).situation).toBe("Two point try");
    v.phase = "dead";
    v.lastEnd = "fieldGoal";
    expect(scoreboard(v).situation).toBe("Extra point");
  });

  it("rounds the clock up so it never shows 0:00 with time left", () => {
    expect(clockText(0.2)).toBe("0:01");
    expect(clockText(150)).toBe("2:30");
    expect(clockText(-1)).toBe("0:00");
  });
});
