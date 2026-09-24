import { describe, expect, it } from "vitest";
import { Arena, type Launch } from "./arena";
import { Blade } from "./blade";
import type { ArenaEvent } from "./events";
import type { BodyKind } from "./fruit-kinds";
import { HALF_HEIGHT } from "./tuning";

const still = (kind: BodyKind, x = 0, y = 0): Launch => ({ kind, x, y, vx: 0, vy: 0, spin: { x: 0, y: 0, z: 0 } });

/** Swipes a blade left to right across y = 0 over a few frames, stepping the arena each time. */
function swipe(arena: Arena, seat = 1, allowed = true): ArenaEvent[] {
  const blade = new Blade();
  const blades = new Map([[seat, blade]]);
  const events: ArenaEvent[] = [];
  for (let i = 0; i <= 10; i++) {
    blade.move({ x: -4 + i * 0.8, y: 0 }, i / 60);
    events.push(...arena.step(0, blades, () => allowed));
  }
  return events;
}

describe("the arena", () => {
  it("slices a fruit the blade sweeps through", () => {
    const arena = new Arena();
    arena.launch(still("orange"));
    const events = swipe(arena);
    const slice = events.find((e) => e.type === "slice");
    expect(slice).toMatchObject({ type: "slice", seat: 1 });
    expect(arena.bodies).toHaveLength(0);
  });

  it("leaves fruit alone for a blade that may not cut", () => {
    const arena = new Arena();
    arena.launch(still("orange"));
    expect(swipe(arena, 1, false).some((e) => e.type === "slice")).toBe(false);
    expect(arena.bodies).toHaveLength(1);
  });

  it("takes several separate hits to burst a big fruit", () => {
    const arena = new Arena();
    const body = arena.launch(still("pomegranate"));
    const kinds: string[] = [];
    for (let pass = 0; pass < body.hits; pass++) {
      body.x = 0;
      body.y = 0;
      body.vx = 0;
      body.vy = 0;
      body.cooldown = 0;
      kinds.push(...swipe(arena).filter((e) => e.type === "hit" || e.type === "burst").map((e) => e.type));
    }
    expect(kinds.slice(0, -1).every((k) => k === "hit")).toBe(true);
    expect(kinds.at(-1)).toBe("burst");
    expect(kinds).toHaveLength(body.hits);
  });

  it("counts one pass through a big fruit as one hit", () => {
    const arena = new Arena();
    arena.launch(still("giant-melon"));
    const hits = swipe(arena).filter((e) => e.type === "hit");
    expect(hits).toHaveLength(1);
  });

  it("counts a slow pass through a big fruit as one hit, however long it takes", () => {
    const arena = new Arena();
    arena.launch(still("giant-melon"));
    const blade = new Blade();
    const blades = new Map([[1, blade]]);
    let hits = 0;
    // Just above cutting speed, so the blade spends about half a second inside the melon.
    for (let i = 0; i <= 120; i++) {
      blade.move({ x: -3 + i * 0.1, y: 0 }, i / 60);
      const body = arena.bodies[0];
      if (body) Object.assign(body, { x: 0, y: 0, vx: 0, vy: 0 });
      hits += arena.step(1 / 60, blades, () => true).filter((e) => e.type === "hit").length;
    }
    expect(hits).toBe(1);
  });

  it("reports a bomb", () => {
    const arena = new Arena();
    arena.launch(still("bomb"));
    expect(swipe(arena).some((e) => e.type === "bomb")).toBe(true);
  });

  it("lets fruit fall away under gravity", () => {
    const arena = new Arena();
    arena.launch(still("apple", 0, -HALF_HEIGHT));
    const events: ArenaEvent[] = [];
    for (let i = 0; i < 120; i++) events.push(...arena.step(1 / 60, new Map(), () => true));
    expect(events.some((e) => e.type === "gone")).toBe(true);
    expect(arena.bodies).toHaveLength(0);
  });
});
