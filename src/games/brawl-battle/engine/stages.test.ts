import { describe, expect, it } from "vitest";
import { CHARACTER_IDS, CHARACTERS } from "../roster";
import { Rng } from "./rng";
import { mainSurface, over, pickStage, STAGE_IDS, STAGES } from "./stages";

/** Height a jump reaches at the fixed step, a little under the ideal v squared over 2g. */
const rise = (v: number, g: number) => ((v * v) / (2 * g)) * 0.95;

describe("the stages", () => {
  it("each have a solid main platform first and pass through platforms after it", () => {
    for (const id of STAGE_IDS) {
      const stage = STAGES[id];
      expect(stage.id).toBe(id);
      expect(mainSurface(stage).bottom).not.toBeNull();
      expect(mainSurface(stage).top).toBe(0);
      const floating = stage.surfaces.slice(1);
      expect(floating.length).toBeGreaterThanOrEqual(2);
      for (const s of floating) expect(s.bottom).toBeNull();
    }
  });

  it("start every fighter on the main platform and respawn them inside the blast zone", () => {
    for (const stage of Object.values(STAGES)) {
      expect(stage.spawns).toHaveLength(4);
      for (const x of stage.spawns) expect(over(mainSurface(stage), x)).toBe(true);
      expect(stage.respawns).toHaveLength(4);
      for (const r of stage.respawns) {
        expect(r.x).toBeGreaterThan(stage.blast.left + 5);
        expect(r.x).toBeLessThan(stage.blast.right - 5);
        expect(r.y + 5 + 2.2).toBeLessThan(stage.blast.top);
        for (const s of stage.surfaces) if (over(s, r.x)) expect(r.y).toBeGreaterThan(s.top + 1);
      }
    }
  });

  it("keep a clear gap between every platform and the blast zone", () => {
    for (const stage of Object.values(STAGES)) {
      for (const s of stage.surfaces) {
        expect(s.x1 - stage.blast.left).toBeGreaterThan(8);
        expect(stage.blast.right - s.x2).toBeGreaterThan(8);
        expect(stage.blast.top - s.top).toBeGreaterThan(9);
      }
      expect(stage.blast.bottom).toBeLessThan(mainSurface(stage).bottom! - 5);
    }
  });

  it("let every fighter reach the low platforms with one jump and the high ones with two", () => {
    for (const id of CHARACTER_IDS) {
      const p = CHARACTERS[id].physique;
      const single = rise(p.jump, p.gravity);
      const both = single + rise(p.doubleJump, p.gravity);
      for (const stage of Object.values(STAGES)) {
        for (const s of stage.surfaces.slice(1)) {
          if (s.top <= 2.2) expect(single, `${id} on ${stage.id}`).toBeGreaterThan(s.top);
          else expect(both, `${id} on ${stage.id}`).toBeGreaterThan(s.top + 0.2);
        }
      }
    }
  });

  it("picks each stage at random, the same for the same seed", () => {
    const seen = new Set<string>();
    const rng = new Rng(3);
    for (let i = 0; i < 60; i++) seen.add(pickStage(rng));
    expect(seen.size).toBe(4);
    expect(pickStage(new Rng(9))).toBe(pickStage(new Rng(9)));
  });
});
