import { describe, expect, it } from "vitest";
import { CORNERS, TOUCH_RANGE } from "./footwork";
import { Match } from "./match";
import { RULES } from "./rules";
import { fighting, hold, ofType, run } from "./test-helpers";

function reachOut(match: Match): void {
  hold(match, 0, { reach: true });
  hold(match, 1, { reach: true });
}

describe("touching gloves", () => {
  it("walks the boxers out from their corners to touch gloves before the first bell", () => {
    const match = new Match({ seed: 2, introMs: 3000 });
    expect(match.footwork.inCorner(0)).toBe(true);
    const events = run(match, 3100);
    expect(match.phase).toBe("touch");
    expect(ofType(events, "bell")).toHaveLength(0);
    expect(match.footwork.distance()).toBeLessThan(TOUCH_RANGE + 0.1);
  });

  it("starts the round once both boxers hold their gloves out", () => {
    const match = new Match({ seed: 2, introMs: 3000 });
    run(match, 3100);
    // Waiting, even a long while, while only one boxer reaches out.
    hold(match, 0, { reach: true });
    expect(ofType(run(match, 2000), "touch")).toHaveLength(0);
    reachOut(match);
    const events = run(match, RULES.touchHoldMs + RULES.touchMs + 100);
    expect(ofType(events, "touch")).toEqual([{ type: "touch", timedOut: false }]);
    expect(ofType(events, "bell")[0]?.kind).toBe("start");
    expect(match.phase).toBe("fight");
  });

  it("does not count a quick punch out as a touch", () => {
    const match = new Match({ seed: 2, introMs: 3000 });
    run(match, 3100);
    reachOut(match);
    run(match, RULES.touchHoldMs / 2);
    hold(match, 0, {});
    expect(ofType(run(match, 500), "touch")).toHaveLength(0);
  });

  it("waves the boxers on when nobody touches in time", () => {
    const match = new Match({ seed: 2, introMs: 3000 });
    run(match, 3100);
    const events = run(match, RULES.touchTimeoutMs + RULES.touchMs + 100);
    expect(ofType(events, "touch")).toEqual([{ type: "touch", timedOut: true }]);
    expect(match.phase).toBe("fight");
  });
});

describe("between rounds", () => {
  it("walks to the corners, sits and heals a couple of hits, then comes back out to touch gloves", () => {
    const match = new Match({ seed: 2, introMs: 3000, roundMs: 2000 });
    run(match, 3100);
    reachOut(match);
    run(match, RULES.touchHoldMs + RULES.touchMs + 100);
    hold(match, 0, {});
    hold(match, 1, {});
    expect(match.phase).toBe("fight");
    match.fighters[0].health = 50;
    const bell = run(match, 2000);
    expect(ofType(bell, "bell").map((b) => b.kind)).toEqual(["end"]);
    expect(match.phase).toBe("break");
    expect(match.breakStage).toBe("walk");
    run(match, RULES.cornerWalkMs);
    expect(match.breakStage).toBe("rest");
    expect(match.footwork.inCorner(0)).toBe(true);
    expect(match.footwork.inCorner(1)).toBe(true);
    run(match, RULES.breakMs - RULES.cornerWalkMs - RULES.walkOutMs);
    expect(match.breakStage).toBe("out");
    expect(match.fighters[0].health).toBeGreaterThan(50 + RULES.breakHeal * 0.95);
    expect(match.fighters[0].health).toBeLessThan(50 + RULES.breakHeal * 1.05);
    run(match, RULES.walkOutMs + 100);
    expect(match.phase).toBe("touch");
    expect(match.round).toBe(2);
    expect(Math.hypot(match.footwork.spots[0].x - CORNERS[0].x, match.footwork.spots[0].z - CORNERS[0].z)).toBeGreaterThan(2);
  });

  it("scores a decision after the last round", () => {
    const match = fighting({ roundMs: 2000, breakMs: 1000, rounds: 2 });
    run(match, 2100);
    expect(match.phase).toBe("break");
    run(match, 1100);
    expect(match.round).toBe(2);
    expect(match.phase).toBe("fight");
    const rest = run(match, 2100);
    expect(match.phase).toBe("over");
    expect(match.result?.method).toBe("Draw");
    expect(ofType(rest, "bell").map((b) => b.kind)).toContain("final");
  });

  it("rounds last about twenty seconds by default", () => {
    expect(RULES.roundMs).toBeGreaterThanOrEqual(15_000);
    expect(RULES.roundMs).toBeLessThanOrEqual(25_000);
  });
});
