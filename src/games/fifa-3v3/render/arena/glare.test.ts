import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { glareStrength } from "./glare";

describe("floodlight glare", () => {
  const facing = new THREE.Vector3(0, -0.6, 0.8).normalize();

  it("blazes when the camera looks straight up the beam", () => {
    expect(glareStrength(facing, facing)).toBe(1);
  });

  it("is gone from behind or beside the lamp", () => {
    expect(glareStrength(facing, facing.clone().negate())).toBe(0);
    expect(glareStrength(facing, new THREE.Vector3(1, 0, 0))).toBe(0);
  });

  it("grows as the camera swings into the beam", () => {
    const a = glareStrength(facing, new THREE.Vector3(0, 0, 1));
    const b = glareStrength(facing, new THREE.Vector3(0, -0.4, 0.9).normalize());
    expect(b).toBeGreaterThan(a);
  });
});
