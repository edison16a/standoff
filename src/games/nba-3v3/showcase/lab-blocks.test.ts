import { describe, expect, it } from "vitest";
import { STEP } from "../engine/tuning";
import { LabFilm } from "./lab";
import { BLOCK_LABS, BLOCK_SETUPS } from "./lab-blocks";

describe("the block lab scenes", () => {
  it("each play the block preset they name, or the near miss", () => {
    for (const scene of BLOCK_LABS) {
      const film = new LabFilm(scene, null);
      const m = film.match;
      let played: string | null = null;
      let planned = false;
      for (let t = 0; t < 4 && !played; t += STEP) {
        film.steer(t);
        m.step(STEP);
        for (const a of m.athletes) if (a.action.kind === "block" && a.action.plan) planned = true;
        for (const e of m.drainEvents()) if (e.type === "block") played = e.preset;
      }
      expect(played, scene).toBe(BLOCK_SETUPS[scene].expect);
      expect(planned, scene).toBe(true);
    }
  });
});
