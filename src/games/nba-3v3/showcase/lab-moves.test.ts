import { describe, expect, it } from "vitest";
import { DRIBBLE_STYLES } from "../engine/dribble-style";
import { STEP } from "../engine/tuning";
import { LabFilm } from "./lab";
import { MOVE_LABS, moveReaction } from "./lab-moves";

describe("the dribble lab scenes", () => {
  it("each beat the man with the reaction made for the move, keep the ball, and flow on into the shot or the drive", () => {
    for (const scene of MOVE_LABS) {
      if (scene === "dribble") continue;
      const film = new LabFilm(scene, null);
      const m = film.match;
      let react: string | null = null;
      let shot = false;
      let fumble = false;
      for (let t = 0; t < 6 && !shot; t += STEP) {
        film.steer(t);
        m.step(STEP);
        for (const e of m.drainEvents()) {
          if (e.type === "shake") react = e.react;
          if (e.type === "shot" || e.type === "dunk") shot = true;
          if (e.type === "fumble") fumble = true;
        }
      }
      expect(react, scene).toBe(moveReaction(scene));
      expect(fumble, scene).toBe(false);
      expect(shot, scene).toBe(true);
    }
  });

  it("walk the dribble through its presets: low on the sprint, shielded with a man on him", () => {
    const film = new LabFilm("dribble", null);
    const m = film.match;
    const a = m.athletes[0]!;
    let lowest = 1;
    for (let t = 0; t < 6.5; t += STEP) {
      film.steer(t);
      m.step(STEP);
      if (t > 1.8 && t < 2.8) lowest = Math.min(lowest, a.dribbleStyle.palm);
    }
    expect(lowest).toBeLessThan(DRIBBLE_STYLES.jog.palm - 0.06);
    expect(a.dribbleStyle.out).toBeGreaterThan(DRIBBLE_STYLES.jog.out + 0.03);
    expect(m.ball.holder).toBe(0);
  });
});
