import { describe, expect, it } from "vitest";
import { Battle } from "./battle";
import type { BattleEvent } from "./events";
import type { FighterSetup } from "./fighter";
import { steppingOut } from "./peek";

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
const speed = (b: Battle) => Math.hypot(b.fighters[0]!.vel.x, b.fighters[0]!.vel.z);

/** Steps on, noting the fastest the player went and how low they stayed. */
function watch(b: Battle, steps: number): { top: number; lowest: number } {
  let top = 0;
  let lowest = 1;
  for (let i = 0; i < steps; i++) {
    b.step();
    top = Math.max(top, speed(b));
    lowest = Math.min(lowest, b.fighters[0]!.crouch);
  }
  return { top, lowest };
}

describe("the crouch switch", { timeout: 60_000 }, () => {
  it("keeps a player low, on the move at a crawl, until it is switched off", () => {
    const b = range();
    const me = b.fighters[0]!;
    const standing = watch(b, 60 * 4).top;
    b.setCrouch(0, true);
    run(b, 30);
    const crouched = watch(b, 60 * 8);
    expect(crouched.lowest).toBe(1);
    expect(me.pose).toBe("crouch");
    expect(crouched.top).toBeGreaterThan(0.5);
    expect(crouched.top).toBeLessThan(standing * 0.65);
    b.setCrouch(0, false);
    run(b, 30);
    expect(me.crouch).toBe(0);
    expect(me.pose).not.toBe("crouch");
  });

  it("brings a crouched player up for a shot, then back down with the switch still on", () => {
    const b = range();
    const me = b.fighters[0]!;
    b.setCrouch(0, true);
    run(b, 60);
    b.setAim(0, Math.PI, 0);
    b.setTrigger(0, true);
    // No paint while still low; it flies once up.
    expect(shots(run(b, 4), 0)).toBe(0);
    expect(shots(run(b, 60), 0)).toBeGreaterThan(3);
    b.setTrigger(0, false);
    run(b, 90);
    expect(me.duck).toBe(true);
    expect(me.crouch).toBe(1);
  });

  it("never crouches a player by themselves: not behind low cover, not to reload", () => {
    const b = range();
    const me = b.fighters[0]!;
    b.setTrigger(0, true);
    run(b, 60);
    b.setTrigger(0, false);
    b.reload(0);
    let lowest = 0;
    for (let i = 0; i < 60 * 12; i++) {
      b.step();
      lowest = Math.max(lowest, me.crouch);
    }
    expect(lowest).toBe(0);
  });
});

describe("shooting round cover", { timeout: 60_000 }, () => {
  it("holds a shot fired from behind a wall until the fighter has stepped out", () => {
    const b = range();
    const me = b.fighters[0]!;
    // Paused behind each tall spot in turn until one steps out round the side.
    let stepped = false;
    for (const spot of b.graph.spots.filter((s) => s.tall)) {
      me.pos = { ...spot.pos };
      Object.assign(me.brain, { stance: "hide", spot: spot.id, route: [], timer: 10, sincePlan: 0 });
      b.setTrigger(0, true);
      run(b, 1);
      if (me.brain.stance === "peek" && me.brain.peekAt) {
        stepped = true;
        break;
      }
      b.setTrigger(0, false);
    }
    expect(stepped).toBe(true);
    let firstShot = -1;
    for (let i = 0; i < 60 && firstShot < 0; i++) {
      // The brain moves the fighter before the trigger is read, so this is where the shot left from.
      if (shots(b.step(), 0) > 0) {
        expect(steppingOut(me)).toBe(false);
        firstShot = i;
      }
    }
    expect(firstShot).toBeGreaterThan(3);
  });
});

describe("training", { timeout: 60_000 }, () => {
  it("leaves the computer players standing still, never shooting", () => {
    const b = range();
    const dummy = b.fighters[1]!;
    const start = { ...dummy.pos };
    const events = run(b, 60 * 8);
    expect(dummy.pos).toEqual(start);
    expect(shots(events, 1)).toBe(0);
  });
});
