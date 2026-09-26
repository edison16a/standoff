import { describe, expect, it } from "vitest";
import { freeFrame } from "./flow";
import { moveOf } from "./moves";
import { fightNow, place, run } from "./test-kit";
import { BUFFER_FRAMES } from "./tuning";
import type { Command } from "./types";

/** Karate at the left facing a bear who stands still, close enough for a jab. */
function sparring(gap = 1.3) {
  const state = fightNow(["karate", "bear"]);
  const [k, bear] = state.fighters;
  place(k!, 0, 1);
  place(bear!, gap, -1);
  return { state, k: k!, bear: bear! };
}

/** Presses from a list of [frame, command] for fighter 0, nothing otherwise. */
function presses(list: [number, Command][]) {
  return (id: number, frame: number) => (id === 0 ? list.find(([at]) => at === frame)?.[1] : undefined);
}

describe("chains", () => {
  it("cancels a landed jab into the side kick, which lands while the target is still stunned", () => {
    const { state, bear } = sparring();
    const script = presses([[0, { x: 0, y: 0, light: true }], [2, { x: 1, y: 0, light: true }]]);
    const events: typeof state.events = [];
    const stunnedAtHit: boolean[] = [];
    for (let i = 0; i < 40; i++) {
      const stunned = bear.action === "hurt";
      events.push(...run(state, 1, (id) => script(id, i)));
      if (state.events.some((e) => e.type === "hit")) stunnedAtHit.push(stunned);
    }
    expect(stunnedAtHit).toEqual([false, true]);
    const swings = events.filter((e) => e.type === "swing" && e.id === 0).map((e) => (e.type === "swing" ? e.move : null));
    expect(swings).toEqual(["jab", "side"]);
  });

  it("strings lights into a heavy on hits", () => {
    const { state, k } = sparring();
    run(state, 60, presses([[0, { x: 0, y: 0, light: true }], [3, { x: 0, y: 0, light: true }], [12, { x: 0, y: 0, heavy: true }]]));
    expect(k.stats.hits).toBe(3);
    expect(k.stats.damageDealt).toBeGreaterThan(20);
  });

  it("does not cancel a move that missed", () => {
    const { state, k } = sparring(6);
    run(state, 3, presses([[0, { x: 0, y: 0, light: true }], [2, { x: 1, y: 0, light: true }]]));
    expect(k.move).toBe("jab");
  });

  it("ends a light string after three lights", () => {
    const { state } = sparring(1.1);
    const jab: Command = { x: 0, y: 0, light: true };
    const events = run(state, 20, presses([[0, jab], [2, jab], [4, jab], [6, jab], [8, jab], [10, jab]]));
    const swings = events.filter((e) => e.type === "swing" && e.id === 0);
    const hits = events.filter((e) => e.type === "hit" && e.attacker === 0);
    // Three cancelled jabs; the fourth waits for the third to recover, so it cannot lock the target.
    expect(hits.length).toBe(3);
    expect(swings.length).toBe(3);
  });
});

describe("recovery and the buffer", () => {
  it("lets a lean of the stick cut a whiffed move's recovery short", () => {
    const { state, k } = sparring(6);
    const jab = moveOf("karate", "jab");
    run(state, 1, presses([[0, { x: 0, y: 0, light: true }]]));
    run(state, freeFrame("jab", jab) - 1, () => ({ x: 0, y: 0 }));
    expect(k.action).toBe("attack");
    run(state, 1, (id) => (id === 0 ? { x: 1, y: 0 } : undefined));
    expect(k.action).toBe("run");
    expect(freeFrame("jab", jab)).toBeLessThan(jab.frames);
  });

  it("plays a move out when nothing is pressed", () => {
    const { state, k } = sparring(6);
    run(state, 1, presses([[0, { x: 0, y: 0, light: true }]]));
    run(state, moveOf("karate", "jab").frames - 1);
    expect(k.action).toBe("attack");
  });

  it("keeps a press made well before a move ends", () => {
    const { state } = sparring(6);
    const heavy = moveOf("karate", "heavy");
    const early = freeFrame("heavy", heavy) - BUFFER_FRAMES + 2;
    const events = run(state, 60, presses([[0, { x: 0, y: 0, heavy: true }], [early, { x: 0, y: 0, light: true }]]));
    const swings = events.filter((e) => e.type === "swing" && e.id === 0);
    expect(swings.length).toBe(2);
  });
});

describe("bodies and momentum", () => {
  it("lets fighters walk straight through each other", () => {
    const state = fightNow(["karate", "bear"]);
    const [k, bear] = state.fighters;
    place(k!, -2, 1);
    place(bear!, 2, -1);
    run(state, 60, (id) => (id === 0 ? { x: 1, y: 0 } : { x: -1, y: 0 }));
    expect(k!.pos.x).toBeGreaterThan(2);
    expect(bear!.pos.x).toBeLessThan(-2);
  });

  it("still lands hits on a fighter standing inside the attacker", () => {
    const { state, k } = sparring(0.2);
    run(state, 20, presses([[0, { x: 0, y: 0, light: true }]]));
    expect(k.stats.hits).toBe(1);
  });

  it("carries a run into an attack", () => {
    const { state, k } = sparring(20);
    run(state, 30, () => ({ x: 1, y: 0 }));
    const start = k.pos.x;
    run(state, 12, presses([[0, { x: 0, y: 0, light: true }]]));
    expect(k.pos.x - start).toBeGreaterThan(0.9);
  });

  it("turns a full run around quickly", () => {
    const { state, k } = sparring(20);
    run(state, 30, () => ({ x: 1, y: 0 }));
    run(state, 12, (id) => (id === 0 ? { x: -1, y: 0 } : undefined));
    expect(k.facing).toBe(-1);
    expect(k.vel.x).toBeLessThan(-4);
  });
});
