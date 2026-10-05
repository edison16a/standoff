import { describe, expect, it } from "vitest";
import { isDown } from "./body";
import { Match } from "./match";
import { extent } from "./physics/ball-shape";
import { BOTS } from "./test-helpers";
import { STEP } from "./tuning";

/**
 * Whole games of computer players, checked every step: nothing goes
 * NaN, the ball never sinks into the turf, and no two players on their
 * feet pass through each other.
 */
describe("long simulations", () => {
  for (const [seed, level] of [[21, "hard"], [22, "medium"], [23, "easy"]] as const) {
    it(`stays sound through a whole ${level} game (seed ${seed})`, () => {
      const m = new Match({ entries: BOTS, seed, level, quarterSeconds: 60 });
      let deepest = 0;
      let closest = Infinity;
      let steps = 0;
      while (m.phase !== "over" && steps < 60 * 60 * 15) {
        m.step(STEP);
        m.drainEvents();
        steps++;
        const f = m.ball.flight;
        if (f) deepest = Math.min(deepest, f.pos.y - extent(f.q, { x: 0, y: -1, z: 0 }));
        expect(Number.isFinite(m.ball.pos.x + m.ball.pos.y + m.ball.pos.z)).toBe(true);
        const up = m.athletes.filter((a) => !isDown(a));
        for (const a of m.athletes) expect(Number.isFinite(a.x + a.z + a.vx + a.vz)).toBe(true);
        for (let i = 0; i < up.length; i++) {
          for (let j = i + 1; j < up.length; j++) {
            const a = up[i]!;
            const b = up[j]!;
            if (a.role === "lineman" && b.role === "lineman") continue;
            closest = Math.min(closest, Math.hypot(a.x - b.x, a.z - b.z));
          }
        }
      }
      expect(m.phase).toBe("over");
      expect(deepest).toBeGreaterThan(-0.01);
      expect(closest).toBeGreaterThan(0.45);
    });
  }
});
