import { describe, expect, it } from "vitest";
import { BUILDS } from "../../builds";
import { buildRig } from "../models/rig";
import { ClothAndBreath } from "./cloth";
import { Flinch } from "./flinch";
import { STAND } from "./pose";

describe("ClothAndBreath", () => {
  it("swings the shorts after a step and settles them with the thigh, even through slow frames", () => {
    const r = buildRig(BUILDS.dunker);
    const c = new ClothAndBreath(1);
    r.joints.hipL.rotation.x = -0.8;
    let overshoot = 0;
    for (let i = 0; i < 200; i++) {
      c.update(r.joints, r.extras, 0, i % 7 === 0 ? 0.08 : 1 / 60);
      overshoot = Math.min(overshoot, r.extras.clothL.rotation.x - -0.8 * 0.9);
      expect(Number.isFinite(r.extras.clothL.rotation.x)).toBe(true);
    }
    expect(overshoot).toBeLessThan(-0.01);
    expect(r.extras.clothL.rotation.x).toBeCloseTo(-0.72, 2);
  });

  it("breathes deeper after a sprint than at rest", () => {
    const depth = (speed: number) => {
      const r = buildRig(BUILDS.big);
      const c = new ClothAndBreath(2);
      let most = 0;
      for (let i = 0; i < 600; i++) {
        c.update(r.joints, r.extras, speed, 1 / 60);
        most = Math.max(most, r.extras.chest.scale.z);
      }
      return most - 1;
    };
    expect(depth(6)).toBeGreaterThan(depth(0) * 1.8);
  });
});

describe("Flinch", () => {
  it("throws the chest the way it was pushed, then lets go", () => {
    const f = new Flinch();
    f.hit(-1, 0, 1);
    const mid = f.apply({ ...STAND }, 0.06);
    expect(mid.torsoX).toBeLessThan(STAND.torsoX - 0.2);
    let late = mid;
    for (let i = 0; i < 40; i++) late = f.apply({ ...STAND }, 1 / 60);
    expect(late.torsoX).toBeCloseTo(STAND.torsoX, 5);
  });
});
