import { describe, expect, it } from "vitest";
import { Battle } from "./battle";
import type { BattleEvent } from "./events";
import type { FighterSetup } from "./fighter";

/** One player against one computer player that stands still, so nothing but the player moves the fight. */
function range(gun: FighterSetup["gun"] = "rifle"): Battle {
  const b = new Battle(
    [
      { team: 0, seat: 1, name: "Me", character: "pro", gun },
      { team: 1, seat: null, name: "Dummy", character: "heavy", gun: "rifle", difficulty: "training" },
    ],
    4,
  );
  while (b.match.phase !== "fight") b.step();
  return b;
}

const run = (b: Battle, steps: number): BattleEvent[] => Array.from({ length: steps }, () => b.step()).flat();
const shots = (events: BattleEvent[], id: number) => events.filter((e) => e.type === "shot" && e.shooter === id).length;

describe("taking cover", () => {
  it("keeps a player down while Crouch is held, and brings them up when it is let go", () => {
    const b = range();
    const me = b.fighters[0]!;
    b.setCrouch(0, true);
    run(b, 90);
    expect(me.pose).toBe("crouch");
    expect(me.crouch).toBeGreaterThan(0.95);
    expect(me.brain.stance).toBe("hide");
    b.setCrouch(0, false);
    run(b, 2);
    expect(me.brain.stance).toBe("peek");
    run(b, 30);
    expect(me.crouch).toBeLessThan(0.1);
  });

  it("holds a shot fired from cover until the fighter has come up", () => {
    const b = range();
    b.setCrouch(0, true);
    run(b, 60);
    b.setAim(0, Math.PI, 0);
    b.setTrigger(0, true);
    expect(shots(run(b, 60), 0)).toBe(0);
    b.setCrouch(0, false);
    expect(shots(run(b, 60), 0)).toBeGreaterThan(3);
  });

  it("brings a hiding player up to shoot when they press Shoot", () => {
    const b = range("sniper");
    const me = b.fighters[0]!;
    run(b, 5);
    // Settled in behind cover for a long wait: only the press should bring them up.
    me.brain.stance = "hide";
    me.brain.timer = 10;
    me.brain.sincePlan = 0;
    b.setTrigger(0, true);
    run(b, 1);
    expect(me.brain.stance).toBe("peek");
  });

  it("ducks to reload", () => {
    const b = range();
    const me = b.fighters[0]!;
    b.setTrigger(0, true);
    run(b, 60);
    b.setTrigger(0, false);
    b.reload(0);
    run(b, 45);
    expect(me.gun.reloading).toBe(true);
    expect(me.brain.stance === "hide" || me.brain.stance === "move").toBe(true);
    if (me.brain.stance === "hide") expect(me.pose).toBe("crouch");
  });
});

describe("training", () => {
  it("leaves the computer players standing still, never shooting", () => {
    const b = range();
    const dummy = b.fighters[1]!;
    const start = { ...dummy.pos };
    const events = run(b, 60 * 8);
    expect(dummy.pos).toEqual(start);
    expect(shots(events, 1)).toBe(0);
  });
});
