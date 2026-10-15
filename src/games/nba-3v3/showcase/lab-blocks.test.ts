import { describe, expect, it } from "vitest";
import { STEP } from "../engine/tuning";
import { LabFilm } from "./lab";
import { BLOCK_LABS, presetOf } from "./lab-blocks";

describe("the block lab scenes", () => {
  it("each play the block preset they name, the near miss without a touch", () => {
    for (const scene of BLOCK_LABS) {
      const film = new LabFilm(scene, null);
      const m = film.match;
      let played: string | null = null;
      let planned: string | null = null;
      let missed = false;
      for (let t = 0; t < 4 && !played && !missed; t += STEP) {
        film.steer(t);
        m.step(STEP);
        for (const a of m.athletes) {
          const act = a.action;
          if (act.kind !== "block" || !act.plan) continue;
          planned = act.plan.preset;
          // A near miss is done once the hand's moment has gone by.
          if (act.plan.preset === "miss" && act.t > act.plan.at + 0.1) missed = true;
        }
        for (const e of m.drainEvents()) if (e.type === "block") played = e.preset;
      }
      const want = presetOf(scene);
      expect(planned, scene).toBe(want);
      expect(played, scene).toBe(want === "miss" ? null : want);
    }
  });
});
