import { describe, expect, it } from "vitest";
import { ZONE_LENGTH } from "../../engine/tuning";
import { CHUNK } from "../models/track";
import { planChunk } from "./scenery";
import { THEMES, themeIndexAt } from "./themes";

describe("scenery plan", () => {
  it("is the same every time for a chunk and seed", () => {
    for (let k = 0; k < 50; k++) expect(planChunk(k, 9)).toEqual(planChunk(k, 9));
  });

  it("keeps tunnels away from the start and from every change of zone", () => {
    let tunnels = 0;
    for (const seed of [1, 2, 3, 4, 5]) {
      for (let k = 0; k < 400; k++) {
        const plan = planChunk(k, seed);
        if (!plan.tunnel) continue;
        tunnels++;
        const start = k * CHUNK;
        expect(k).toBeGreaterThanOrEqual(6);
        // A tunnel chunk and the whole run of chunks it belongs to sit inside one zone.
        const zone = Math.floor(start / ZONE_LENGTH);
        expect(Math.floor((start + CHUNK - 1) / ZONE_LENGTH)).toBe(zone);
      }
    }
    expect(tunnels).toBeGreaterThan(0);
  });

  it("opens every tunnel with a portal", () => {
    for (let k = 1; k < 400; k++) {
      const plan = planChunk(k, 3);
      if (plan.tunnel && !planChunk(k - 1, 3).tunnel) expect(plan.mouth).toBe(true);
    }
  });

  it("dresses the sides from the zone's own theme", () => {
    for (let k = 0; k < 200; k++) {
      const plan = planChunk(k, 4);
      const theme = THEMES[themeIndexAt(k * CHUNK)]!;
      const kinds = theme.sides.map(([kind]) => kind);
      expect(kinds).toContain(plan.left);
      expect(kinds).toContain(plan.right);
    }
  });
});
