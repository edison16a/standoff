import { describe, expect, it } from "vitest";
import { MAX_HEALTH, MIN_GAP } from "./rules";
import { hold, makeEngine, runUntil, settle, standApart, swing, toLive } from "./test-helpers";

/** Player two's sword pointed at the floor, out of every cut's way. */
const DOWN = hold(-1.2, -1.2, 0);
const RIGHT = hold(1.2, 0, 0.8);
const LEFT = hold(-1, 0, 0.8);

describe("Engine", () => {
  it("counts down, then fights", () => {
    const { engine, events, phases } = makeEngine();
    toLive(engine);
    expect(phases).toEqual(["countdown", "live"]);
    expect(events.filter((e) => e.type === "countdown").map((e) => e.type === "countdown" && e.remaining)).toEqual([3, 2, 1]);
    expect(events.at(-1)?.type).toBe("fight");
  });

  it("walks the fighters forward and back along the line", () => {
    const { engine } = makeEngine();
    toLive(engine);
    const start = engine.fighters[1].x;
    runUntil(engine, () => engine.fighters[1].x > start + 0.5, 2000, () => engine.control(1, { ...hold(0, 0.5), move: 1 }));
    const back = engine.fighters[1].x;
    runUntil(engine, () => engine.fighters[1].x < back - 0.5, 2000, () => engine.control(1, { ...hold(0, 0.5), move: -1 }));
  });

  it("lands a hit with a fast cut through the body", () => {
    const { engine, events } = makeEngine();
    toLive(engine);
    settle(engine, { 1: RIGHT, 2: DOWN });
    standApart(engine, 1.6);
    swing(engine, 1, RIGHT, LEFT, 150, { 2: DOWN });
    const hits = events.filter((e) => e.type === "hit");
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ attacker: 1, victim: 2, health: MAX_HEALTH - 1, final: false, part: "torso" });
    expect(engine.fighters[2].action).toBe("hit");
    expect(events.some((e) => e.type === "swing" && e.slot === 1)).toBe(true);
  });

  it("does not count a blade resting on the body, or moved through it slowly", () => {
    const { engine, events } = makeEngine();
    toLive(engine);
    // Settled out of reach first, so getting into the pose is not itself a swing.
    settle(engine, { 1: hold(0, 0, 1), 2: DOWN });
    standApart(engine, 1.4);
    swing(engine, 1, hold(0, 0, 1), hold(0.4, 0.1, 1), 1500, { 2: DOWN });
    expect(events.filter((e) => e.type === "hit")).toEqual([]);
  });

  it("waits out the cooldown before the same blade lands again", () => {
    const { engine, events } = makeEngine(undefined, { hitCooldownMs: 1500 });
    toLive(engine);
    settle(engine, { 1: RIGHT, 2: DOWN });
    standApart(engine, 1.6);
    swing(engine, 1, RIGHT, LEFT, 150, { 2: DOWN });
    swing(engine, 1, LEFT, RIGHT, 150, { 2: DOWN });
    standApart(engine, 1.6);
    expect(events.filter((e) => e.type === "hit")).toHaveLength(1);
    settle(engine, { 1: RIGHT, 2: DOWN });
    settle(engine, { 1: RIGHT, 2: DOWN });
    standApart(engine, 1.6);
    swing(engine, 1, RIGHT, LEFT, 150, { 2: DOWN });
    expect(events.filter((e) => e.type === "hit")).toHaveLength(2);
  });

  it("stops a cut on a blade held across its path, and throws both swords", () => {
    const { engine, events } = makeEngine();
    toLive(engine);
    const block = hold(-1.5, 0.1, 0.2);
    settle(engine, { 1: RIGHT, 2: block });
    standApart(engine, 1.6);
    swing(engine, 1, RIGHT, LEFT, 150, { 2: block });
    const clash = events.find((e) => e.type === "clash");
    expect(clash).toBeDefined();
    expect(events.filter((e) => e.type === "hit")).toEqual([]);
    expect(engine.fighters[1].health).toBe(MAX_HEALTH);
    expect(engine.fighters[2].health).toBe(MAX_HEALTH);
  });

  it("knocks the swords off the phones after a clash, then gives them back", () => {
    const { engine, events } = makeEngine();
    toLive(engine);
    const block = hold(-1.5, 0.1, 0.2);
    settle(engine, { 1: RIGHT, 2: block });
    standApart(engine, 1.6);
    const steps = 9;
    for (let i = 1; i <= steps; i++) {
      const k = i / steps;
      engine.control(1, { ...hold(1.2 - 2.2 * k, 0, 0.8), move: 0 });
      engine.control(2, { ...block, move: 0 });
      engine.tick();
      if (events.some((e) => e.type === "clash")) break;
    }
    const frame = engine.scene().fighters[1];
    expect(frame.knocked).toBe(1);
    expect(frame.action).toBe("stagger");
    expect(engine.scene().fighters[0].knocked).toBe(1);
    settle(engine, { 1: LEFT, 2: block });
    settle(engine, { 1: LEFT, 2: block });
    expect(engine.scene().fighters[0].knocked).toBe(0);
    expect(engine.scene().fighters[0].control.yaw).toBeCloseTo(LEFT.yaw, 2);
  });

  it("ends the fight on the last hit, crowns the winner and starts a rematch when both ask", () => {
    const { engine, events, phases } = makeEngine(undefined, { hitCooldownMs: 150 });
    toLive(engine);
    for (let i = 0; i < MAX_HEALTH && engine.phase === "live"; i++) {
      const [from, to] = i % 2 === 0 ? [RIGHT, LEFT] : [LEFT, RIGHT];
      settle(engine, { 1: from, 2: DOWN });
      standApart(engine, 1.6);
      swing(engine, 1, from, to, 150, { 2: DOWN });
    }
    const hits = events.filter((e) => e.type === "hit");
    expect(hits).toHaveLength(MAX_HEALTH);
    expect(hits.at(-1)).toMatchObject({ final: true, health: 0 });
    expect(phases.at(-1)).toBe("finish");
    expect(engine.fighters[2].action).toBe("defeat");
    runUntil(engine, () => engine.phase === "matchOver", 3000);
    expect(events.at(-1)).toMatchObject({ type: "matchWon", winner: 1 });
    expect(engine.fighters[1].action).toBe("victory");
    expect(engine.rematch(1)).toBe(false);
    expect(engine.rematch(2)).toBe(true);
    expect(engine.phase).toBe("countdown");
    expect(engine.fighters[2].health).toBe(MAX_HEALTH);
  });

  it("pauses when a phone drops and counts down again, health kept, when it is back", () => {
    const { engine } = makeEngine();
    toLive(engine);
    settle(engine, { 1: RIGHT, 2: DOWN });
    standApart(engine, 1.6);
    swing(engine, 1, RIGHT, LEFT, 150, { 2: DOWN });
    engine.setConnected({ 1: true, 2: false });
    expect(engine.phase).toBe("paused");
    engine.setConnected({ 1: true, 2: true });
    expect(engine.phase).toBe("countdown");
    expect(engine.fighters[2].health).toBe(MAX_HEALTH - 1);
    expect(engine.fighters[2].x).toBe(engine.fighters[2].startX);
  });

  it("keeps the bodies apart", () => {
    const { engine } = makeEngine();
    toLive(engine);
    for (let i = 0; i < 240; i++) {
      engine.control(1, { ...hold(0, 0.5), move: 1 });
      engine.control(2, { ...hold(0, 0.5), move: 1 });
      engine.tick();
    }
    expect(engine.fighters[2].x - engine.fighters[1].x).toBeCloseTo(MIN_GAP, 5);
  });
});
