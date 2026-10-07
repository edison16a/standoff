import { describe, expect, it } from "vitest";
import { STEP, TACKLE } from "../engine/tuning";
import { KEY_ART } from "./keyart";
import { STAGES } from "./lab-scenes";
import { recordStage } from "./lab-stage";

// The icon holds this staged moment, so an engine change that moves it should fail here.
describe("the icon's key art", () => {
  const frames = recordStage(STAGES.keyart);
  const at = frames[Math.floor(KEY_ART.t / STEP)]!;
  const [carrier, ...divers] = at;

  it("holds the carrier on his feet at full speed with the ball", () => {
    expect(carrier!.action).toBe("none");
    expect(carrier!.speed).toBeGreaterThan(6);
  });

  it("has both defenders in the air at him and neither on him yet", () => {
    expect(divers).toHaveLength(2);
    for (const d of divers) {
      expect(d.action).toBe("lunge");
      expect(Math.hypot(d.x - carrier!.x, d.z - carrier!.z)).toBeGreaterThan(TACKLE.contact * 0.8);
    }
    expect(new Set(divers.map((d) => d.lunge)).size).toBe(2);
  });

  it("ends in a real gang tackle", () => {
    expect(frames.some((f) => f[0]!.action === "down")).toBe(true);
  });
});
