import { describe, expect, it } from "vitest";
import { RULES } from "./rules";
import { fighting, hold, ofType, run } from "./test-helpers";
import type { Match } from "./match";

function floor(match: Match): void {
  match.fighters[1].health = 1;
  match.throwPunch(0, "right", "cross", 1);
  run(match, 200);
}

describe("knockdowns", () => {
  it("puts a boxer down at no health and starts the count", () => {
    const match = fighting();
    floor(match);
    expect(match.phase).toBe("knockdown");
    const counts = ofType(run(match, RULES.fallMs + 2100), "count");
    expect(counts.map((c) => c.count)).toEqual([1, 2, 3]);
  });

  it("gets a boxer up when both gloves stay raised, with some health back", () => {
    const match = fighting();
    floor(match);
    run(match, RULES.fallMs + 1100);
    hold(match, 1, { raise: true });
    const events = run(match, RULES.raiseHoldMs + RULES.riseMs + RULES.resumeMs + 200);
    expect(ofType(events, "rise")).toHaveLength(1);
    expect(ofType(events, "resume")).toHaveLength(1);
    expect(match.phase).toBe("fight");
    expect(match.fighters[1].health).toBe(RULES.getUpHealth[0]);
  });

  it("will not let a boxer up before the count starts", () => {
    const match = fighting();
    floor(match);
    hold(match, 1, { raise: true });
    expect(ofType(run(match, RULES.fallMs - 100), "rise")).toHaveLength(0);
  });

  it("needs a fresh raise, not gloves still held up from before the fall", () => {
    const match = fighting();
    hold(match, 1, { raise: true });
    floor(match);
    expect(match.phase).toBe("knockdown");
    expect(ofType(run(match, RULES.fallMs + 3 * RULES.countMs), "rise")).toHaveLength(0);
    hold(match, 1, {});
    run(match, 100);
    hold(match, 1, { guard: true, raise: true });
    expect(ofType(run(match, RULES.raiseHoldMs + 100), "rise")).toHaveLength(1);
  });

  it("is a knockout at ten", () => {
    const match = fighting();
    floor(match);
    const events = run(match, RULES.fallMs + 10 * RULES.countMs + 100);
    expect(ofType(events, "stoppage")[0]).toMatchObject({ fighter: 1, method: "KO" });
    expect(match.result).toMatchObject({ winner: 0, method: "KO", round: 1 });
  });

  it("stops the fight on the third knockdown", () => {
    const match = fighting();
    for (let i = 0; i < 2; i++) {
      floor(match);
      run(match, RULES.fallMs + 1100);
      hold(match, 1, { raise: true });
      run(match, RULES.raiseHoldMs + RULES.riseMs + RULES.resumeMs + 200);
      hold(match, 1, {});
      run(match, 400);
    }
    floor(match);
    expect(match.phase).toBe("stoppage");
    const events = run(match, RULES.stoppageMs + 100);
    expect(ofType(events, "stoppage")[0]?.method).toBe("TKO");
    expect(match.result?.winner).toBe(0);
    expect(match.fighters[1].stats.knockdowns).toBe(3);
  });

  it("scores a knockdown against the boxer who went down", () => {
    const match = fighting({ roundMs: 8000 });
    floor(match);
    run(match, RULES.fallMs + 1100);
    hold(match, 1, { raise: true });
    run(match, 9000);
    const card = match.result ? match.result.cards[0] : null;
    expect(match.fighters[1].roundKnockdowns[0]).toBe(1);
    if (card) expect(card[1]).toBeLessThan(card[0]);
  });
});
