import { describe, expect, it } from "vitest";
import type { Action } from "../../engine/types";
import { CHARACTER_IDS } from "../../roster";
import { motionPose, type MotionInput } from "./motion";
import { CHANNELS, restPose } from "./pose";
import { STYLES } from "./styles";

const ACTIONS: Action[] = ["idle", "run", "jumpsquat", "air", "land", "hurt", "shield", "dizzy", "respawn"];

const input = (action: Action, extra: Partial<MotionInput> = {}): MotionInput => ({
  action, frame: 5, speed: 5, rise: 3, stride: 0.3, time: 1.2, doubleJump: false, launch: 0, winner: false, ...extra,
});

describe("motionPose", () => {
  it("gives a finite pose for every action and fighter", () => {
    for (const c of CHARACTER_IDS) {
      for (const action of ACTIONS) {
        const pose = motionPose(STYLES[c], input(action), restPose());
        for (const ch of CHANNELS) expect(Number.isFinite(pose[ch]), `${c} ${action} ${ch}`).toBe(true);
      }
    }
  });

  it("somersaults on a double jump and tumbles when launched hard", () => {
    const style = STYLES.karate;
    expect(motionPose(style, input("air", { doubleJump: true, frame: 12 }), restPose()).flip).toBeGreaterThan(1);
    expect(motionPose(style, input("hurt", { launch: 20, frame: 10 }), restPose()).flip).not.toBe(0);
    expect(motionPose(style, input("hurt", { launch: 3, frame: 10 }), restPose()).flip).toBe(0);
  });

  it("does not keep a flip from one call to the next", () => {
    const style = STYLES.bear;
    const out = restPose();
    motionPose(style, input("air", { doubleJump: true, frame: 12 }), out);
    expect(motionPose(style, input("idle"), out).flip).toBe(0);
  });
});
