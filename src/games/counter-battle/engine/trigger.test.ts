import { describe, expect, it } from "vitest";
import { Battle } from "./battle";
import type { FighterSetup } from "./fighter";
import { fighterAt } from "./test-helpers";
import { humanTrigger, PULL_KEEP, rising, type FireResult } from "./trigger";

describe("a player's trigger", () => {
  it("keeps a press while the fighter rises from cover, then fires once", () => {
    const f = fighterAt(0, 0, 0, 0, "sniper");
    f.brain.stance = "peek";
    f.crouch = 0.8;
    f.trigger = { held: true, pulls: 1, pulledAt: 0 };
    const shots: number[] = [];
    const fire = (): FireResult => {
      shots.push(1);
      return "fired";
    };
    humanTrigger(f, 0.05, fire);
    expect(shots).toHaveLength(0);
    expect(f.trigger.pulls).toBe(1);
    f.crouch = 0.1;
    humanTrigger(f, 0.1, fire);
    expect(shots).toHaveLength(1);
    expect(f.trigger.pulls).toBe(0);
  });

  it("drops a press that waited too long", () => {
    const f = fighterAt(0, 0, 0, 0, "sniper");
    f.brain.stance = "peek";
    f.crouch = 1;
    f.trigger = { held: false, pulls: 1, pulledAt: 0 };
    humanTrigger(f, PULL_KEEP + 0.01, () => "fired");
    expect(f.trigger.pulls).toBe(0);
  });

  it("shoots from where the fighter is while Crouch is held", () => {
    const f = fighterAt(0, 0, 0, 0, "rifle");
    f.brain.stance = "peek";
    f.crouch = 1;
    f.crouchHeld = true;
    expect(rising(f)).toBe(false);
  });
});

describe("the crouch button", () => {
  const setups: FighterSetup[] = [
    { team: 0, seat: 1, name: "Me", character: "pro", gun: "rifle" },
    { team: 1, seat: null, name: "Bot", character: "heavy", gun: "rifle", difficulty: "training" },
  ];
  const settled = (): Battle => {
    const b = new Battle(setups, 3);
    while (b.match.phase !== "fight") b.step();
    b.step();
    // Run to the first cover and let the fighter settle behind it.
    for (let i = 0; i < 60 * 12 && b.fighters[0]!.brain.stance === "move"; i++) b.step();
    for (let i = 0; i < 30; i++) b.step();
    return b;
  };

  it("keeps the fighter down behind cover while held, never looking out", () => {
    const b = settled();
    b.setCrouch(0, true);
    const me = b.fighters[0]!;
    let peeks = 0;
    for (let i = 0; i < 60 * 8; i++) {
      b.step();
      if (me.brain.stance === "peek") peeks += 1;
    }
    expect(peeks).toBe(0);
    expect(me.pose === "crouch" || me.brain.stance === "move").toBe(true);
  });

  it("rises to shoot when Shoot is pressed behind cover", () => {
    const b = settled();
    const me = b.fighters[0]!;
    for (let i = 0; i < 60 * 8 && me.brain.stance !== "hide"; i++) b.step();
    expect(me.brain.stance).toBe("hide");
    b.setAim(0, me.look, 0);
    b.setTrigger(0, true);
    b.step();
    expect(me.brain.stance).toBe("peek");
  });
});
