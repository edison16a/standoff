import { describe, expect, it } from "vitest";
import { CHARACTERS } from "../roster";
import { STAGES } from "./stages";
import { fightNow, hang, place, run } from "./test-kit";
import type { Command } from "./types";

const stage = STAGES["dojo-rooftop"];

/** Highest point reached over some frames. */
function peak(state: ReturnType<typeof fightNow>, frames: number, script: (id: number, frame: number) => Command | undefined): number {
  let top = -Infinity;
  for (let i = 0; i < frames; i++) {
    run(state, 1, (id) => script(id, i));
    top = Math.max(top, state.fighters[0]!.pos.y);
  }
  return top;
}

describe("moving about", () => {
  it("runs toward the stick and faces that way", () => {
    const state = fightNow(["karate"]);
    const f = state.fighters[0]!;
    place(f, 0, 1);
    run(state, 30, () => ({ x: -1, y: 0 }));
    expect(f.pos.x).toBeLessThan(-2);
    expect(f.facing).toBe(-1);
    expect(f.action).toBe("run");
    expect(Math.abs(f.vel.x)).toBeCloseTo(CHARACTERS.karate.physique.run, 1);
  });

  it("jumps about as high as its speed allows, then lands", () => {
    const state = fightNow(["karate"]);
    const f = state.fighters[0]!;
    place(f, -1);
    const p = CHARACTERS.karate.physique;
    const top = peak(state, 90, (_, i) => (i === 0 ? { x: 0, y: 1, jump: true } : { x: 0, y: 0 }));
    expect(top).toBeGreaterThan((p.jump * p.jump) / (2 * p.gravity) * 0.85);
    expect(top).toBeLessThan((p.jump * p.jump) / (2 * p.gravity) * 1.05);
    expect(f.ground).toBe(0);
  });

  it("jumps again in the air once, and no more until landing", () => {
    const state = fightNow(["karate"]);
    const f = state.fighters[0]!;
    place(f, -1);
    const jumps = run(state, 42, (_, i) => (i === 0 || i === 20 || i === 40 ? { x: 0, y: 1, jump: true } : { x: 0, y: 0 }));
    const kinds = jumps.filter((e) => e.type === "jump").map((e) => (e.type === "jump" ? e.double : null));
    expect(kinds).toEqual([false, true]);
    expect(f.airJumps).toBe(0);
  });

  it("goes higher with the double jump than without", () => {
    const single = fightNow(["mage"]);
    place(single.fighters[0]!, 0);
    const one = peak(single, 80, (_, i) => (i === 0 ? { x: 0, y: 1, jump: true } : { x: 0, y: 0 }));
    const double = fightNow(["mage"]);
    place(double.fighters[0]!, 0);
    const two = peak(double, 80, (_, i) => (i === 0 || i === 22 ? { x: 0, y: 1, jump: true } : { x: 0, y: 0 }));
    expect(two).toBeGreaterThan(one + 1);
  });

  it("jumps up through a floating platform and lands on top of it", () => {
    const state = fightNow(["karate"]);
    const f = state.fighters[0]!;
    const platform = stage.surfaces[1]!;
    place(f, (platform.x1 + platform.x2) / 2);
    run(state, 80, (_, i) => (i === 0 ? { x: 0, y: 1, jump: true } : { x: 0, y: 0 }));
    expect(f.ground).toBe(1);
    expect(f.pos.y).toBeCloseTo(platform.top);
  });

  it("drops through a floating platform with a flick down, but not through the main one", () => {
    const state = fightNow(["karate"]);
    const f = state.fighters[0]!;
    const platform = stage.surfaces[1]!;
    place(f, (platform.x1 + platform.x2) / 2);
    f.pos.y = platform.top;
    f.ground = 1;
    run(state, 40, (_, i) => (i === 2 ? { x: 0, y: -1 } : { x: 0, y: 0 }));
    expect(f.ground).toBe(0);
    run(state, 20, (_, i) => (i < 12 ? { x: 0, y: -1 } : { x: 0, y: 0 }));
    expect(f.ground).toBe(0);
    expect(f.pos.y).toBe(0);
  });

  it("walks off the edge into the air and fast falls with down held", () => {
    const slow = fightNow(["samurai"]);
    const a = slow.fighters[0]!;
    hang(a, 12, 4);
    run(slow, 30, () => ({ x: 0, y: 0 }));
    const fast = fightNow(["samurai"]);
    const b = fast.fighters[0]!;
    hang(b, 12, 4);
    run(fast, 30, () => ({ x: 0, y: -1 }));
    expect(b.pos.y).toBeLessThan(a.pos.y - 1);

    const walker = fightNow(["samurai"]);
    const w = walker.fighters[0]!;
    place(w, 8);
    run(walker, 20, () => ({ x: 1, y: 0 }));
    expect(w.ground).toBeNull();
    expect(w.action).toBe("air");
  });

  it("cannot pass through the side of the main platform", () => {
    const state = fightNow(["bear"]);
    const f = state.fighters[0]!;
    hang(f, stage.surfaces[0]!.x2 + 1.5, -1);
    run(state, 20, () => ({ x: -1, y: 0 }));
    expect(f.pos.x).toBeGreaterThanOrEqual(stage.surfaces[0]!.x2 + CHARACTERS.bear.physique.width / 2 - 1e-6);
  });

  it("stays put during the countdown", () => {
    const state = fightNow(["karate"]);
    state.phase = "ready";
    const f = state.fighters[0]!;
    place(f, 0);
    run(state, 30, () => ({ x: 1, y: 0, light: true }));
    expect(f.pos.x).toBe(0);
    expect(f.action).toBe("idle");
  });
});
