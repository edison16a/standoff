import { describe, expect, it } from "vitest";
import { HitReaction, type HitBlow } from "./hit-reaction";
import { hitWeight } from "./hit-weight";
import { makeRig, type BodyDims } from "./rig";
import { soften, stepSpring } from "./spring";

const DIMS: BodyDims = {
  thigh: 0.45, shin: 0.42, foot: 0.08, torso: 0.55, torsoW: 0.36, torsoD: 0.22, shoulderW: 0.4, hipW: 0.24,
  upperArm: 0.3, forearm: 0.27, hand: 0.1, neck: 0.1, head: 0.24, arm: 0.09, leg: 0.12,
};

/** A round straight down the street into the zombie, which faces the team. */
const straight = (weight: number, part: HitBlow["part"] = "body", side = 0): HitBlow => ({ dirX: 0, dirZ: -1, side, weight, part });

/** The biggest lean back, head snap and shove a reaction reaches over its first half second. */
function peak(blows: HitBlow[]): { lean: number; nod: number; shove: number } {
  const reaction = new HitReaction();
  for (const blow of blows) reaction.hit(blow);
  const rig = makeRig(DIMS);
  const out = { lean: 0, nod: 0, shove: 0 };
  const shove = { x: 0, z: 0 };
  for (let t = 0; t < 0.5; t += 1 / 60) {
    reaction.step(1 / 60);
    for (const bone of Object.values(rig.bones)) bone.rotation.set(0, 0, 0);
    reaction.apply(rig);
    out.lean = Math.max(out.lean, -rig.bones.spine.rotation.x);
    out.nod = Math.max(out.nod, -rig.bones.head.rotation.x);
    out.shove = Math.max(out.shove, -reaction.shove(shove).z);
  }
  return out;
}

describe("springs", () => {
  it("come back to rest after a kick", () => {
    const s = { x: 0, v: 5 };
    for (let i = 0; i < 120; i++) stepSpring(s, { stiffness: 120, damping: 13 }, 1 / 60);
    expect(Math.abs(s.x)).toBeLessThan(1e-3);
  });

  it("stay stable on a slow frame", () => {
    const s = { x: 0, v: 5 };
    stepSpring(s, { stiffness: 200, damping: 17 }, 0.1);
    expect(Math.abs(s.x)).toBeLessThan(1);
  });

  it("bend a big sum toward the limit and leave small ones alone", () => {
    expect(soften(0.05, 0.8)).toBeCloseTo(0.05, 2);
    expect(soften(5, 0.8)).toBeLessThan(0.8);
  });
});

describe("hit reactions", () => {
  it("shove a zombie back along the round's path", () => {
    const { lean, shove } = peak([straight(1)]);
    expect(lean).toBeGreaterThan(0.2);
    expect(shove).toBeGreaterThan(0.05);
  });

  it("hit harder with an AK round than a 9 mm one", () => {
    const ak = peak([straight(hitWeight("ak47", "body", "walker", false))]);
    const smg = peak([straight(hitWeight("smg", "body", "walker", false))]);
    expect(ak.lean).toBeGreaterThan(smg.lean * 2);
  });

  it("hit hardest with a load of buckshot landing together", () => {
    const pellet = hitWeight("shotgun", "body", "walker", false);
    const buck = peak(Array.from({ length: 7 }, () => straight(pellet)));
    const ak = peak([straight(hitWeight("ak47", "body", "walker", false))]);
    expect(buck.shove).toBeGreaterThan(ak.shove);
  });

  it("snap the head back on a head shot", () => {
    const head = peak([straight(0.55, "head")]);
    const body = peak([straight(0.55, "body")]);
    expect(head.nod).toBeGreaterThan(body.nod * 3);
  });

  it("barely rock a boss", () => {
    const walker = hitWeight("ak47", "body", "walker", false);
    const boss = hitWeight("ak47", "body", "behemoth", false);
    expect(boss).toBeLessThan(walker / 3);
  });

  it("settle back to the plain pose", () => {
    const reaction = new HitReaction();
    reaction.hit(straight(1, "head", 1));
    for (let t = 0; t < 3; t += 1 / 60) reaction.step(1 / 60);
    const rig = makeRig(DIMS);
    reaction.apply(rig);
    expect(Math.abs(rig.bones.head.rotation.x)).toBeLessThan(1e-3);
    expect(Math.abs(rig.bones.spine.rotation.x)).toBeLessThan(1e-3);
  });
});
