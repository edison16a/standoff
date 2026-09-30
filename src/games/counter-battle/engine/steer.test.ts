import { describe, expect, it } from "vitest";
import { Battle } from "./battle";
import { dist, type V2 } from "./vec";

/** One player against a computer player that stands still, so only the player moves. */
function range(): Battle {
  const b = new Battle(
    [
      { team: 0, seat: 1, name: "Me", character: "pro", gun: "rifle" },
      { team: 1, seat: null, name: "Dummy", character: "heavy", gun: "rifle", difficulty: "training" },
    ],
    4,
  );
  while (b.match.phase !== "fight") b.step();
  return b;
}

const run = (b: Battle, steps: number) => {
  for (let i = 0; i < steps; i++) b.step();
};

describe("ADVANCE and RETREAT", { timeout: 60_000 }, () => {
  it("holds a player where they are with neither button", () => {
    const b = range();
    const me = b.fighters[0]!;
    run(b, 5);
    const start = { ...me.pos };
    run(b, 60 * 10);
    expect(dist(me.pos, start)).toBeLessThan(0.05);
    expect(me.brain.stance).not.toBe("move");
  });

  it("moves forward toward the enemy while ADVANCE is held, cover to cover", () => {
    const b = range();
    const [me, enemy] = b.fighters as [(typeof b.fighters)[0], (typeof b.fighters)[0]];
    run(b, 5);
    const before = dist(me.pos, enemy.pos);
    const reached: number[] = [];
    b.setMove(0, 1);
    for (let i = 0; i < 60 * 4; i++) {
      const last = me.brain.last;
      b.step();
      if (me.brain.last !== last) reached.push(me.brain.last);
    }
    expect(dist(me.pos, enemy.pos)).toBeLessThan(before - 6);
    // It ran along the cover graph, stopping by at real spots.
    expect(reached.length).toBeGreaterThan(0);
    expect(me.pose).toBe("run");
  });

  it("stops the moment both are let go, even partway along a run", () => {
    const b = range();
    const me = b.fighters[0]!;
    run(b, 5);
    b.setMove(0, 1);
    run(b, 20);
    b.setMove(0, 0);
    run(b, 1);
    const at = { ...me.pos };
    run(b, 120);
    expect(dist(me.pos, at)).toBeLessThan(0.01);
  });

  it("turns back to the spot it came from on RETREAT", () => {
    const b = range();
    const me = b.fighters[0]!;
    run(b, 5);
    const from: V2 = { ...b.graph.spots[me.brain.spot]!.pos };
    b.setMove(0, 1);
    run(b, 15);
    expect(dist(me.pos, from)).toBeGreaterThan(0.5);
    b.setMove(0, -1);
    run(b, 60);
    // Back at the start, or already on past it the way it retreats.
    const passed = b.graph.spots[me.brain.last]!.pos;
    expect(dist(passed, from)).toBeLessThan(0.01);
  });

  it("moves crouched, slower, while Crouch is held", () => {
    const upright = range();
    const low = range();
    for (const b of [upright, low]) run(b, 5);
    low.setCrouch(0, true);
    run(low, 30);
    const a = { ...upright.fighters[0]!.pos };
    const c = { ...low.fighters[0]!.pos };
    upright.setMove(0, 1);
    low.setMove(0, 1);
    run(upright, 30);
    run(low, 30);
    const me = low.fighters[0]!;
    expect(me.pose).toBe("crouch");
    expect(me.crouch).toBe(1);
    expect(Math.hypot(me.vel.x, me.vel.z)).toBeGreaterThan(0.5);
    const ratio = dist(me.pos, c) / dist(upright.fighters[0]!.pos, a);
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(0.7);
  });

  it("lets the computer play a player whose phone dropped, ducking and all", () => {
    const b = range();
    const me = b.fighters[0]!;
    run(b, 5);
    b.setAutopilot(0, true);
    let ducked = false;
    for (let i = 0; i < 60 * 8 && !ducked; i++) {
      b.step();
      ducked = me.pose === "crouch";
    }
    expect(ducked).toBe(true);
  });
});
