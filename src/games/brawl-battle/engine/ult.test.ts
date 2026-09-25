import { describe, expect, it } from "vitest";
import { createMatch } from "./match";
import { fightNow, once, place, run } from "./test-kit";
import { FPS, ULT } from "./tuning";

describe("the ult meter", () => {
  it("fills over time during the fight, and not before it", () => {
    const waiting = createMatch([{ character: "karate", seat: 1 }]);
    run(waiting, 100);
    expect(waiting.fighters[0]!.ult).toBe(0);

    const state = fightNow(["karate"]);
    run(state, FPS * 10);
    expect(state.fighters[0]!.ult).toBeCloseTo(10 / ULT.fillSeconds, 2);
    const events = run(state, FPS * ULT.fillSeconds);
    expect(state.fighters[0]!.ult).toBe(1);
    expect(events.filter((e) => e.type === "ultReady")).toHaveLength(1);
  });

  it("fills faster by landing hits, and a little by taking them", () => {
    const state = fightNow(["samurai", "karate"]);
    const [a, b] = state.fighters;
    place(a!, 0, 1);
    place(b!, 1.6, -1);
    run(state, 30, once(0, 0, { x: 0, y: 0, heavy: true }));
    const timeShare = 30 / FPS / ULT.fillSeconds;
    expect(a!.ult).toBeGreaterThan(timeShare + 0.05);
    expect(b!.ult).toBeGreaterThan(timeShare);
    expect(b!.ult).toBeLessThan(a!.ult);
  });

  it("does nothing until full, then empties when used", () => {
    const state = fightNow(["mage"]);
    const f = state.fighters[0]!;
    place(f, 0);
    f.ult = 0.9;
    run(state, 2, once(0, 0, { x: 0, y: 0, ult: true }));
    expect(f.action).not.toBe("attack");
    f.ult = 1;
    const events = run(state, 2, once(0, 0, { x: 0, y: 0, ult: true }));
    expect(f.move).toBe("ult");
    expect(f.ult).toBeLessThan(0.01);
    expect(f.stats.ults).toBe(1);
    expect(events.some((e) => e.type === "ult")).toBe(true);
  });
});
