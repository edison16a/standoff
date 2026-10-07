import { describe, expect, it } from "vitest";
import { STEP } from "../engine/tuning";
import { LabFilm } from "./lab";
import { PRESET_SCENES } from "./lab-presets";

describe("the preset lab scenes", () => {
  it("each play their own layup or dunk, all the way to the net", () => {
    for (const scene of PRESET_SCENES) {
      const film = new LabFilm(scene, null);
      const m = film.match;
      let played: string | null = null;
      let net = false;
      for (let t = 0; t < 5 && !net; t += STEP) {
        film.steer(t);
        m.step(STEP);
        for (const e of m.drainEvents()) {
          if (e.type === "net") net = true;
          if (e.type !== "gather") continue;
          const act = m.athletes[e.id]!.action;
          if (act.kind === "drive") played = act.dunk ? `dunk-${act.style}` : `layup-${act.layup}`;
        }
      }
      expect(played, scene).toBe(scene);
      expect(net, scene).toBe(true);
    }
  });
});
