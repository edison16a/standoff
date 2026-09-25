import { describe, expect, it } from "vitest";
import { MOVESETS } from "./moves";
import { fightNow, once, place, run } from "./test-kit";
import type { MatchEvent } from "./events";

const hits = (events: MatchEvent[]) => events.filter((e) => e.type === "hit");

describe("hits", () => {
  it("land a jab on a fighter in front and add its damage", () => {
    const state = fightNow(["karate", "samurai"]);
    const [a, b] = state.fighters;
    place(a!, 0, 1);
    place(b!, 1, -1);
    const events = run(state, 20, once(0, 0, { x: 0, y: 0, light: true }));
    expect(hits(events)).toHaveLength(1);
    expect(b!.percent).toBe(MOVESETS.karate.jab.hitboxes[0]!.damage);
    expect(a!.stats.hits).toBe(1);
    expect(a!.stats.damageDealt).toBe(b!.percent);
  });

  it("miss a fighter behind or out of reach", () => {
    const state = fightNow(["karate", "samurai", "bear"]);
    const [a, b, c] = state.fighters;
    place(a!, 0, 1);
    place(b!, -1.2, 1);
    place(c!, 4, -1);
    const events = run(state, 20, once(0, 0, { x: 0, y: 0, light: true }));
    expect(hits(events)).toHaveLength(0);
  });

  it("hit each fighter once per swing, but once per group for a flurry", () => {
    const state = fightNow(["karate", "bear"]);
    const [a, b] = state.fighters;
    place(a!, 0, 1);
    place(b!, 1, -1);
    a!.ult = 1;
    const events = run(state, 90, once(0, 0, { x: 1, y: 0, ult: true }));
    const onBear = hits(events).filter((e) => e.type === "hit" && e.target === 1);
    expect(onBear.length).toBeGreaterThan(2);
    const groups = new Set(MOVESETS.karate.ult.hitboxes.map((h) => h.group ?? 0));
    expect(onBear.length).toBeLessThanOrEqual(groups.size);
  });

  it("launch further at high percent", () => {
    const launched = (percent: number) => {
      const state = fightNow(["samurai", "karate"]);
      const [a, b] = state.fighters;
      place(a!, 0, 1);
      place(b!, 1.6, -1);
      b!.percent = percent;
      run(state, 60, once(0, 0, { x: 0, y: 0, heavy: true }));
      return b!.pos.x;
    };
    expect(launched(120)).toBeGreaterThan(launched(0) + 4);
  });

  it("freeze both fighters for a moment on contact", () => {
    const state = fightNow(["bear", "mage"]);
    const [a, b] = state.fighters;
    place(a!, 0, 1);
    place(b!, 1.5, -1);
    const events = run(state, 19, once(0, 0, { x: 0, y: 0, heavy: true }));
    const hit = hits(events)[0];
    expect(hit?.type === "hit" && hit.heavy).toBe(true);
    expect(a!.freeze).toBeGreaterThan(0);
    expect(b!.freeze).toBe(a!.freeze);
    expect(b!.action).toBe("hurt");
  });

  it("trade when two fighters hit each other on the same frame", () => {
    const state = fightNow(["karate", "karate"]);
    const [a, b] = state.fighters;
    place(a!, 0, 1);
    place(b!, 1, -1);
    run(state, 20, (_, frame) => (frame === 0 ? { x: 0, y: 0, light: true } : undefined));
    expect(a!.percent).toBeGreaterThan(0);
    expect(b!.percent).toBeGreaterThan(0);
  });

  it("let armor soak a small hit without stopping the move", () => {
    const state = fightNow(["bear", "karate"]);
    const [bear, karate] = state.fighters;
    place(bear!, 0, 1);
    place(karate!, 1.1, -1);
    // The Bear starts Big Paw; the jab lands inside its armor window.
    run(state, 12, (id, frame) => (id === 0 && frame === 0 ? { x: 0, y: 0, heavy: true } : id === 1 && frame === 5 ? { x: 0, y: 0, light: true } : undefined));
    expect(bear!.percent).toBeGreaterThan(0);
    expect(bear!.action).toBe("attack");
    expect(bear!.move).toBe("heavy");
  });

  it("throw a bolt that hits far away and then is gone", () => {
    const state = fightNow(["mage", "samurai"]);
    const [mage, samurai] = state.fighters;
    place(mage!, -6, 1);
    place(samurai!, 1, -1);
    const events = run(state, 60, once(0, 0, { x: 0, y: 0, heavy: true }));
    expect(events.some((e) => e.type === "projectile")).toBe(true);
    expect(samurai!.percent).toBe(MOVESETS.mage.heavy.projectiles![0]!.damage);
    expect(state.projectiles).toHaveLength(0);
    // The thrower does not freeze with a far away hit.
    expect(mage!.freeze).toBe(0);
  });
});

describe("the shield", () => {
  it("rises when down is held on the main platform and blocks damage", () => {
    const state = fightNow(["karate", "samurai"]);
    const [a, b] = state.fighters;
    place(a!, 0, 1);
    place(b!, 1, -1);
    const events = run(state, 30, (id, frame) => (id === 1 ? { x: 0, y: -1 } : id === 0 && frame === 8 ? { x: 0, y: 0, light: true } : undefined));
    expect(b!.action).toBe("shield");
    expect(b!.percent).toBe(0);
    expect(b!.shield).toBeLessThan(1);
    expect(events.some((e) => e.type === "block")).toBe(true);
  });

  it("breaks after too many blocks and leaves the fighter dizzy", () => {
    const state = fightNow(["bear", "samurai"]);
    const [a, b] = state.fighters;
    place(a!, 0, 1);
    place(b!, 1.5, -1);
    b!.shield = 0.2;
    const events = run(state, 40, (id, frame) => (id === 1 ? { x: 0, y: -1 } : id === 0 && frame === 6 ? { x: 0, y: 0, heavy: true } : undefined));
    expect(events.some((e) => e.type === "shieldBreak")).toBe(true);
    expect(b!.action).toBe("dizzy");
  });

  it("does not stop an ult", () => {
    const state = fightNow(["samurai", "karate"]);
    const [a, b] = state.fighters;
    place(a!, 0, 1);
    place(b!, 2, -1);
    a!.ult = 1;
    run(state, 90, (id, frame) => (id === 1 ? { x: 0, y: -1 } : id === 0 && frame === 8 ? { x: 1, y: 0, ult: true } : undefined));
    expect(b!.percent).toBeGreaterThan(15);
  });
});
