import { describe, expect, it } from "vitest";
import { syntheticPose } from "@/games/kit/camera";
import { deriveBody } from "@/games/kit/camera/engine/body";
import { defenseFrom } from "./player-input";
import { mirrorFrom } from "./mirror";
import { FOREARM, UPPER_ARM } from "../render/models/arm";

const bodyOf = (spec: Parameters<typeof syntheticPose>[0]) => deriveBody(syntheticPose(spec), 0, 16 / 9, null);

describe("mirrorFrom", () => {
  it("reaches the boxer's glove toward the opponent when the player punches at the camera", () => {
    const mirror = mirrorFrom(bodyOf({ left: { guard: 1, punch: 1 }, right: { guard: 1 } }), null)!;
    const left = mirror.reach.left!;
    const right = mirror.reach.right!;
    // Straight out in front, nearly the boxer's full arm.
    expect(left.z).toBeGreaterThan(0.4);
    expect(left.length()).toBeGreaterThan((UPPER_ARM + FOREARM) * 0.85);
    // The other glove stays home by the chin.
    expect(right.z).toBeLessThan(left.z - 0.2);
    expect(right.y).toBeGreaterThan(0);
  });

  it("keeps the player's left glove on the boxer's left", () => {
    const mirror = mirrorFrom(bodyOf({ left: { raise: 1 }, right: {} }), null)!;
    expect(mirror.reach.left!.y).toBeGreaterThan(0.3);
    expect(mirror.reach.right!.y).toBeLessThan(-0.3);
  });

  it("is null with nobody there", () => {
    expect(mirrorFrom(null, null)).toBeNull();
  });
});

describe("defenseFrom", () => {
  it("counts both hands raised overhead as getting up", () => {
    const body = bodyOf({ left: { raise: 1 }, right: { raise: 1 } });
    const moves = { present: true, guard: false, ducking: false, lean: 0 } as unknown as Parameters<typeof defenseFrom>[0];
    expect(defenseFrom(moves, body).raise).toBe(true);
    expect(defenseFrom(moves, bodyOf({})).raise).toBe(false);
  });

  it("does nothing for a player out of view", () => {
    expect(defenseFrom(null, null)).toEqual({ guard: false, duck: false, slip: 0, raise: false });
  });
});
