import { describe, expect, it } from "vitest";
import { syntheticPose } from "@/games/kit/camera";
import { deriveBody } from "@/games/kit/camera/engine/body";
import { coverFrom, reachingOut } from "./gloves";
import { defenseFrom, levelOf } from "./player-input";
import { mirrorFrom } from "./mirror";
import { FOREARM, UPPER_ARM } from "../render/models/arm";

type Spec = Parameters<typeof syntheticPose>[0];

/** A little back from the camera, so arms raised overhead stay in the picture. */
const bodyOf = (spec: Spec) => deriveBody(syntheticPose({ height: 1.2, ...spec }), 0, 16 / 9, null);
const GUARD: Spec = { left: { guard: 1 }, right: { guard: 1 } };

describe("mirrorFrom", () => {
  it("reaches the boxer's glove toward the opponent when the player punches at the camera", () => {
    const mirror = mirrorFrom(bodyOf({ left: { guard: 1, punch: 1 }, right: { guard: 1 } }))!;
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
    const mirror = mirrorFrom(bodyOf({ left: { raise: 1 }, right: {} }))!;
    expect(mirror.reach.left!.y).toBeGreaterThan(0.3);
    expect(mirror.reach.right!.y).toBeLessThan(-0.3);
  });

  it("is null with nobody there", () => {
    expect(mirrorFrom(null)).toBeNull();
  });
});

describe("the gloves as cover", () => {
  it("puts both gloves in front of the face in a guard, the sides and body only half covered", () => {
    const cover = coverFrom(bodyOf(GUARD));
    for (const hand of ["left", "right"] as const) {
      expect(cover[hand].face).toBeGreaterThan(0.9);
      expect(cover[hand].side).toBeLessThan(0.6);
      expect(cover[hand].body).toBeLessThan(0.7);
    }
  });

  it("covers the side of the head with a glove raised by the ear", () => {
    const cover = coverFrom(bodyOf({ left: { guard: 1, raise: 0.3 }, right: { guard: 1 } }));
    expect(cover.left.side).toBeGreaterThan(0.9);
    expect(cover.right.side).toBeLessThan(0.6);
  });

  it("covers the body with the hands low and the elbows down", () => {
    const cover = coverFrom(bodyOf({ left: { guard: 0.5 }, right: { guard: 0.5 } }));
    expect(cover.left.body).toBeGreaterThan(0.9);
    expect(cover.left.face).toBeLessThan(0.1);
  });

  it("covers nothing with the arms out in a punch", () => {
    const cover = coverFrom(bodyOf({ left: { guard: 1, punch: 1 }, right: { guard: 1, punch: 1 } }));
    expect(Math.max(cover.left.face, cover.left.side, cover.left.body)).toBe(0);
  });
});

describe("touching gloves", () => {
  it("counts both arms held out in front, but not a guard or arms out wide", () => {
    expect(reachingOut(bodyOf({ left: { punch: 1 }, right: { punch: 1 } }))).toBe(true);
    expect(reachingOut(bodyOf(GUARD))).toBe(false);
    expect(reachingOut(bodyOf({ left: { wide: 1 }, right: { wide: 1 } }))).toBe(false);
    expect(reachingOut(bodyOf({ left: { punch: 1 }, right: {} }))).toBe(false);
  });
});

describe("defenseFrom", () => {
  const moves = { present: true, calibrated: true, guard: false, head: { rise: 0, side: 0 } } as unknown as Parameters<typeof defenseFrom>[0];

  it("counts both hands raised overhead as getting up", () => {
    expect(defenseFrom(moves, bodyOf({ left: { raise: 1 }, right: { raise: 1 } })).raise).toBe(true);
    expect(defenseFrom(moves, bodyOf({})).raise).toBe(false);
  });

  it("carries the head spot through", () => {
    expect(defenseFrom(moves, bodyOf(GUARD), { x: 0.2, y: -0.1 }).head).toEqual({ x: 0.2, y: -0.1 });
  });

  it("does nothing for a player out of view", () => {
    const none = defenseFrom(null, null);
    expect(none.guard || none.raise || none.reach).toBe(false);
    expect(none.head).toEqual({ x: 0, y: 0 });
  });

  it("sends a punch thrown low, or while dipping, to the body", () => {
    const straight = bodyOf({ left: { guard: 1, punch: 1 }, right: { guard: 1 } });
    expect(levelOf(moves, straight, "left")).toBe("head");
    const dipping = { ...moves, head: { rise: -0.45, side: 0 } } as typeof moves;
    expect(levelOf(dipping, straight, "left")).toBe("body");
    // The same punch, with the fist driven in at the height of the shoulder.
    const low = { ...straight, arms: { ...straight.arms, left: { ...straight.arms.left, offset: { x: 0, y: 0.1 } } } };
    expect(levelOf(moves, low, "left")).toBe("body");
  });
});
