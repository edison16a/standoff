import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../engine/events";
import { STEP } from "../engine/tuning";
import { LabFilm } from "./lab";
import { DUNK_FAIL_SCENES, PRESET_SCENES, type PresetScene } from "./lab-presets";

/** Plays a scene until the net or `seconds`, and says which finish its gather started. */
function playScene(scene: PresetScene, seconds = 5): { played: string | null; events: MatchEvent[] } {
  const film = new LabFilm(scene, null);
  const m = film.match;
  let played: string | null = null;
  const events: MatchEvent[] = [];
  for (let t = 0; t < seconds && !events.some((e) => e.type === "net"); t += STEP) {
    film.steer(t);
    m.step(STEP);
    for (const e of m.drainEvents()) {
      events.push(e);
      if (e.type !== "gather") continue;
      const act = m.athletes[e.id]!.action;
      if (act.kind === "drive") played = act.dunk ? `dunk-${act.style}` : `layup-${act.layup}`;
    }
  }
  return { played, events };
}

describe("the preset lab scenes", () => {
  it("each play their own layup or dunk, all the way to the net", () => {
    for (const scene of PRESET_SCENES) {
      if ((DUNK_FAIL_SCENES as readonly string[]).includes(scene)) continue;
      const { played, events } = playScene(scene);
      expect(played, scene).toBe(scene);
      expect(events.some((e) => e.type === "net"), scene).toBe(true);
    }
  });

  it("play each failed dunk the way it names, and nothing goes in", () => {
    for (const scene of DUNK_FAIL_SCENES) {
      const { events } = playScene(scene, 3.5);
      const fail = events.find((e) => e.type === "dunkFail");
      expect(fail && fail.type === "dunkFail" ? fail.fail : null, scene).toBe(scene.slice(9));
      expect(events.some((e) => e.type === "score"), scene).toBe(false);
    }
  });

  it("puts the stopper's hand on the ball in a stuff: a block by him at the rim", () => {
    const { events } = playScene("dunkfail-stuff", 3.5);
    const block = events.find((e) => e.type === "block");
    expect(block && block.type === "block" ? block.id : null).toBe(3);
  });
});
