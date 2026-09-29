import { describe, expect, it } from "vitest";
import { RING_MIN } from "../engine/portal-frame";
import { trace } from "../engine/trace";
import { CORE_HALF, HALF } from "../engine/tuning";
import type { Level } from "../engine/types";
import { LEVELS, levelById } from "./index";

/** Higher than any run reaches: a pad's throw from the tallest platform is well under this. */
const REACH = 24;

/** The heights a solid covers in the portal's column, merged, lowest first. */
function covered(level: Level, x: number): [number, number][] {
  const spans = level.solids
    .filter((s) => s.x <= x - CORE_HALF && s.x + s.w >= x + CORE_HALF)
    .map((s): [number, number] => [s.y, s.y + s.h])
    .sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [from, to] of spans) {
    const last = merged.at(-1);
    if (last && from <= last[1] + 1e-6) last[1] = Math.max(last[1], to);
    else merged.push([from, to]);
  }
  return merged;
}

/** Whether solids cover every height from `from` to `to` in the column. */
function closed(spans: [number, number][], from: number, to: number): boolean {
  return spans.some(([a, b]) => a <= from + 1e-6 && b >= to - 1e-6);
}

describe("portals", () => {
  for (const entry of LEVELS) {
    const level = levelById(entry.info.id);
    const crossed = level.portals.filter((p) => p.x > 2);

    it(`${entry.info.name}: every portal is closed over and under, so no run skips it`, () => {
      expect(crossed.length).toBeGreaterThan(0);
      for (const portal of crossed) {
        const spans = covered(level, portal.x);
        // Floor or a pillar up to the ring, then a wall or ceiling from its top to out of reach.
        expect(closed(spans, -1, portal.bottom), `under the ${portal.mode} portal at x ${portal.x.toFixed(1)}`).toBe(true);
        expect(closed(spans, portal.top, REACH), `over the ${portal.mode} portal at x ${portal.x.toFixed(1)}`).toBe(true);
        expect(portal.top - portal.bottom).toBeGreaterThanOrEqual(Math.min(RING_MIN, (portal.ceiling ?? RING_MIN) - 0.01));
      }
    });

    it(`${entry.info.name}: the perfect run goes through the middle of every ring`, () => {
      const run = trace(level, level.solution.map((beat) => (beat * 60) / level.bpm));
      for (const portal of crossed) {
        const at = run.points.find((p) => p.x >= portal.x)!;
        expect(at.y - HALF).toBeGreaterThanOrEqual(portal.bottom);
        expect(at.y + HALF).toBeLessThanOrEqual(portal.top);
      }
    });
  }
});
