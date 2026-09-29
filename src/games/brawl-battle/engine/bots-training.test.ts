import { describe, expect, it } from "vitest";
import { makeBrain } from "./bots/brain";
import { createMatch, setBot } from "./match";
import { fightNow, place, run } from "./test-kit";

describe("training bots", () => {
  it("stand still and never swing, jump or shield", () => {
    const state = fightNow(["karate", "bear"], { bots: true });
    const [a, b] = state.fighters;
    for (const f of state.fighters) f.brain = makeBrain("training", f.slot);
    place(a!, 0, 1);
    place(b!, 1.5, -1);
    const events = run(state, 300);
    expect(events.filter((e) => e.type === "swing")).toHaveLength(0);
    expect(a!.pos).toEqual({ x: 0, y: 0 });
    expect(b!.pos).toEqual({ x: 1.5, y: 0 });
    expect(a!.action).not.toBe("shield");
  });

  it("leave a dropped player's fighter to a bot that still fights", () => {
    const state = createMatch([{ character: "mage", seat: 1 }, { character: "bear", seat: null }], { difficulty: "training" });
    setBot(state, 0, true);
    expect(state.fighters[0]!.brain?.difficulty).toBe("medium");
    expect(state.fighters[1]!.brain?.difficulty).toBe("training");
  });
});
