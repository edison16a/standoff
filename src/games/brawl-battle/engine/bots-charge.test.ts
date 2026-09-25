import { describe, expect, it } from "vitest";
import { makeBrain, SKILLS } from "./bots/brain";
import { planCharge } from "./bots/charge-plan";
import { isChargeKey } from "./moves";
import { Rng } from "./rng";
import { fightNow, place, run } from "./test-kit";

describe("bots and charged moves", () => {
  it("wind one up on a stunned target out of reach of anything else, and let it go", () => {
    const state = fightNow(["samurai", "bear"], { bots: true });
    const [bot, target] = state.fighters;
    bot!.brain = makeBrain("hard", 0);
    bot!.brain.wait = 1;
    place(bot!, -2, 1);
    place(target!, 3, -1);
    target!.brain = null;
    target!.action = "dizzy";
    target!.frame = 0;
    target!.percent = 90;
    const events = run(state, 140);
    expect(events.some((e) => e.type === "charge" && e.id === 0)).toBe(true);
    expect(events.some((e) => e.type === "swing" && e.id === 0 && isChargeKey(e.move))).toBe(true);
  });

  it("do not dash off the edge with a long charged lunge", () => {
    const state = fightNow(["samurai", "karate"]);
    const [f, t] = state.fighters;
    const edge = state.stage.surfaces[0]!.x2;
    place(f!, edge - 1.2, 1);
    place(t!, edge - 0.2, -1);
    t!.action = "dizzy";
    f!.brain = makeBrain("hard", 0);
    const rng = new Rng(3);
    for (let i = 0; i < 50; i++) {
      const plan = planCharge(state, f!, t!, SKILLS.hard, rng);
      expect(plan?.key).not.toBe("holdHeavy");
    }
  });
});

describe("holding Attack with the stick up", () => {
  it("stays on the ground to charge the up move instead of jumping", () => {
    const state = fightNow(["karate"]);
    const f = state.fighters[0]!;
    place(f, 0);
    run(state, 40, (_, frame) => (frame === 0 ? { x: 0, y: 1, jump: true, light: true, lightHeld: true } : { x: 0, y: 1, lightHeld: true }));
    expect(f.ground).toBe(0);
    expect(f.action).toBe("charge");
    expect(f.move).toBe("holdUp");
  });
});
