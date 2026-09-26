import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { makeZombie, walkSpeed } from "../../../engine/zombie";
import type { ZombieKind } from "../../../engine/zombie-kinds";
import { poseZombie, strideRate } from "./animate";
import { makeRig, type BodyDims } from "./rig";

const DIMS: BodyDims = {
  thigh: 0.44, shin: 0.42, foot: 0.08, torso: 0.58, torsoW: 0.42, torsoD: 0.24, shoulderW: 0.5, hipW: 0.22,
  upperArm: 0.3, forearm: 0.27, hand: 0.1, neck: 0.1, head: 0.24, arm: 0.09, leg: 0.12,
};

/** Walks a zombie on the spot for two cycles, the way the zombie layer drives it. */
function walk(kind: ZombieKind) {
  // A seed without the limp, so both legs swing the full stride.
  const z = makeZombie(1, kind, 20, 0, 0, { hpScale: 1, speedScale: 1, harm: 1, weakHp: 1, seed: 0.4 });
  const rig = makeRig(DIMS);
  const rate = strideRate(rig, z);
  const dt = 1 / 240;
  const ankle = new THREE.Vector3();
  const frames: { l: THREE.Vector3; r: THREE.Vector3 }[] = [];
  let cycle = 0;
  for (let i = 0; i < Math.round(2 / rate / dt); i++) {
    z.age += dt;
    cycle += rate * dt;
    poseZombie(rig, z, 0, cycle);
    rig.root.updateMatrixWorld(true);
    frames.push({ l: rig.bones.ankleL.getWorldPosition(ankle).clone(), r: rig.bones.ankleR.getWorldPosition(ankle).clone() });
  }
  return { frames, dt, pace: walkSpeed(z) };
}

const KINDS = ["walker", "runner", "brute", "armored"] as const;

describe("a walking zombie's legs", () => {
  it.each(KINDS)("sweep back under a %s as fast as it walks, so the feet do not skate", (kind) => {
    const { frames, dt, pace } = walk(kind);
    // The foot going back is the one carrying the body. The body walks towards +z.
    let back = 0;
    for (let i = 1; i < frames.length; i++) {
      const dl = frames[i]!.l.z - frames[i - 1]!.l.z;
      const dr = frames[i]!.r.z - frames[i - 1]!.r.z;
      back += -Math.min(dl, dr);
    }
    const sweep = back / (frames.length * dt);
    expect(sweep / pace).toBeGreaterThan(0.8);
    expect(sweep / pace).toBeLessThan(1.3);
  });

  it.each(KINDS)("keep a %s's lower foot on the road all through the stride", (kind) => {
    const lows = walk(kind).frames.map(({ l, r }) => Math.min(l.y, r.y));
    expect(Math.max(...lows) - Math.min(...lows)).toBeLessThan(0.01);
  });
});
