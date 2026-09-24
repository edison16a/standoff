import { describe, expect, it } from "vitest";
import { LM, type Pose } from "./landmarks";
import { LandmarkSmoother } from "./smoothing";
import { syntheticPose } from "./synthetic";

/** A seeded random source, so the noise is the same on every run. */
function mulberry(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry(7);

/** A standing pose with a random wobble, like the model's frame to frame noise. */
function jittered(amount = 0.004): Pose {
  const pose = syntheticPose();
  const wobble = () => (random() - 0.5) * 2 * amount;
  return {
    landmarks: pose.landmarks.map((p) => ({ ...p, x: p.x + wobble(), y: p.y + wobble() })),
    world: pose.world,
  };
}

describe("smoothing the points", () => {
  it("steadies a player standing still", () => {
    const smoother = new LandmarkSmoother();
    let rawSpread = 0;
    let smoothSpread = 0;
    const still = syntheticPose().landmarks[LM.nose]!;
    for (let frame = 0; frame < 240; frame++) {
      const raw = jittered();
      const smooth = smoother.smooth(raw, frame * 33);
      if (frame < 30) continue;
      rawSpread += Math.abs(raw.landmarks[LM.nose]!.x - still.x);
      smoothSpread += Math.abs(smooth.landmarks[LM.nose]!.x - still.x);
    }
    expect(smoothSpread).toBeLessThan(rawSpread * 0.5);
  });

  it("keeps up with a fast move within a few frames", () => {
    const smoother = new LandmarkSmoother();
    for (let frame = 0; frame < 10; frame++) smoother.smooth(syntheticPose({ x: 0.3 }), frame * 33);
    let reached = -1;
    for (let frame = 10; frame < 30; frame++) {
      const out = smoother.smooth(syntheticPose({ x: 0.6 }), frame * 33);
      const hips = (out.landmarks[LM.leftHip]!.x + out.landmarks[LM.rightHip]!.x) / 2;
      if (reached < 0 && hips > 0.57) reached = frame - 10;
    }
    // Ninety percent of a jump across the picture within 150 ms.
    expect(reached).toBeGreaterThanOrEqual(0);
    expect(reached * 33).toBeLessThanOrEqual(150);
  });

  it("starts over after a reset instead of gliding in", () => {
    const smoother = new LandmarkSmoother();
    smoother.smooth(syntheticPose({ x: 0.2 }), 0);
    smoother.reset();
    const out = smoother.smooth(syntheticPose({ x: 0.8 }), 33);
    expect((out.landmarks[LM.leftHip]!.x + out.landmarks[LM.rightHip]!.x) / 2).toBeCloseTo(0.8, 6);
  });

  it("passes visibility through untouched", () => {
    const out = new LandmarkSmoother().smooth(syntheticPose({ visibility: 0.42 }), 0);
    expect(out.landmarks[LM.nose]!.visibility).toBe(0.42);
  });
});
