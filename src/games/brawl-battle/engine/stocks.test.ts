import { describe, expect, it } from "vitest";
import { hittable } from "./combat";
import { fightNow, hang, place, run } from "./test-kit";
import { RESPAWN } from "./tuning";

describe("lives", () => {
  it("lose one when a fighter leaves the blast zone, with credit to the last hitter", () => {
    const state = fightNow(["karate", "bear"]);
    const [a, b] = state.fighters;
    place(a!, 0);
    hang(b!, state.stage.blast.right + 1, 3);
    b!.lastHitBy = { id: 0, frame: state.frame };
    const events = run(state, 1);
    const ko = events.find((e) => e.type === "ko");
    expect(ko).toMatchObject({ type: "ko", id: 1, by: 0, stocksLeft: 1 });
    expect(b!.stocks).toBe(1);
    expect(b!.action).toBe("dead");
    expect(a!.stats.kos).toBe(1);
    expect(b!.stats.falls).toBe(1);
  });

  it("give nobody credit for a fall long after the last hit", () => {
    const state = fightNow(["karate", "bear"]);
    const b = state.fighters[1]!;
    hang(b, 0, state.stage.blast.bottom - 3);
    b.lastHitBy = { id: 0, frame: -1000 };
    const events = run(state, 1);
    expect(events.find((e) => e.type === "ko")).toMatchObject({ by: null });
  });

  it("bring a fighter back on a descending platform, invincible, at 0 percent", () => {
    const state = fightNow(["karate", "bear"]);
    const b = state.fighters[1]!;
    b.percent = 88;
    hang(b, state.stage.blast.left - 1, 2);
    run(state, 1);
    run(state, RESPAWN.wait);
    expect(b.action).toBe("respawn");
    expect(b.percent).toBe(0);
    const startY = b.pos.y;
    run(state, RESPAWN.descend / 2);
    expect(b.pos.y).toBeLessThan(startY);
    expect(hittable(b)).toBe(false);
    run(state, RESPAWN.descend);
    expect(b.action).toBe("respawn");
    // Moving the stick steps off the platform, still invincible for a while.
    run(state, 1, (id) => (id === 1 ? { x: 1, y: 0 } : undefined));
    expect(b.action).toBe("air");
    expect(b.invincible).toBeGreaterThan(RESPAWN.invincible - 5);
    run(state, RESPAWN.invincible + 2);
    expect(hittable(b)).toBe(true);
  });

  it("step a fighter off the platform on their own after a while", () => {
    const state = fightNow(["karate", "bear"]);
    const b = state.fighters[1]!;
    hang(b, 0, state.stage.blast.bottom - 2);
    run(state, 1 + RESPAWN.wait + RESPAWN.descend + RESPAWN.hold + 2);
    expect(b.action).not.toBe("respawn");
  });

  it("end the fight when one fighter is left, with places by who lasted longest", () => {
    const state = fightNow(["karate", "bear", "mage"]);
    const [a, b, c] = state.fighters;
    place(a!, 0);
    b!.stocks = 1;
    c!.stocks = 1;
    hang(c!, 0, state.stage.blast.bottom - 2);
    run(state, 5);
    expect(c!.action).toBe("out");
    expect(state.phase).toBe("fight");
    hang(b!, 0, state.stage.blast.bottom - 2);
    const events = run(state, 1);
    expect(state.phase).toBe("game");
    expect(state.winner).toBe(0);
    expect(events.find((e) => e.type === "game")).toMatchObject({ winner: 0 });
    expect([a!.place, b!.place, c!.place]).toEqual([1, 2, 3]);
  });

  it("call a draw when the last two fall on the same step", () => {
    const state = fightNow(["karate", "bear"]);
    const [a, b] = state.fighters;
    a!.stocks = 1;
    b!.stocks = 1;
    hang(a!, -2, state.stage.blast.bottom - 2);
    hang(b!, 2, state.stage.blast.bottom - 2);
    run(state, 1);
    expect(state.phase).toBe("game");
    expect(state.winner).toBeNull();
    expect([a!.place, b!.place]).toEqual([1, 1]);
  });

  it("moves on to the results after the Game call", () => {
    const state = fightNow(["karate", "bear"]);
    const b = state.fighters[1]!;
    b.stocks = 1;
    hang(b, 0, state.stage.blast.bottom - 2);
    run(state, 1);
    expect(state.phase).toBe("game");
    const events = run(state, 200);
    expect(state.phase).toBe("over");
    expect(events.filter((e) => e.type === "over")).toHaveLength(1);
  });
});
