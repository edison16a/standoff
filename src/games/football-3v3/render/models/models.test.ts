import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../../builds";
import { BALL_HALF, BALL_RADIUS, orientBall, profile } from "./football";
import { buildFor, buildKit, linemanKit } from "./kit";

describe("the football", () => {
  it("is fat in the middle and pointed at the ends", () => {
    const p = profile(16);
    expect(p[8]![0]).toBeCloseTo(BALL_RADIUS);
    expect(p[0]![0]).toBeLessThan(0.01);
    expect(p[16]![1]).toBeCloseTo(BALL_HALF);
  });

  it("lays its long axis along the flight and rolls about it", () => {
    const q = new THREE.Quaternion();
    const axis = new THREE.Vector3(1, 0.2, 0).normalize();
    orientBall(q, axis, 1.3);
    expect(new THREE.Vector3(0, 1, 0).applyQuaternion(q).angleTo(axis)).toBeLessThan(1e-6);
    // The laces face +z before the roll, and turn about the axis with it.
    const laces0 = new THREE.Vector3(0, 0, 1).applyQuaternion(orientBall(new THREE.Quaternion(), axis, 0));
    const laces1 = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    expect(laces0.angleTo(laces1)).toBeCloseTo(1.3, 5);
  });
});

describe("kits", () => {
  it("gives every build a different look", () => {
    const looks = BUILD_IDS.map((id) => {
      const k = buildKit(0, id);
      return `${k.look.mask}:${k.look.visor}:${k.sleeves}:${k.locks}:${k.neckRoll}:${k.towel}:${k.look.skin}`;
    });
    expect(new Set(looks).size).toBe(BUILD_IDS.length);
  });

  it("dresses the teams in their own colours", () => {
    expect(buildKit(0, "gunslinger").jersey).not.toBe(buildKit(1, "gunslinger").jersey);
    expect(buildKit(1, "speedster", "Sam").name).toBe("SAM");
    expect(buildKit(1, "speedster").name).toBeNull();
    expect(linemanKit(1, 91, 0).name).toBeNull();
  });

  it("makes heavier players bigger built", () => {
    expect(buildFor(1.96, 140)).toBeGreaterThan(buildFor(1.85, 86));
    expect(buildFor(1.7, 60)).toBe(0);
  });
});
