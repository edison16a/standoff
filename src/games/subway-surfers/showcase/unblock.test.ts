import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { unblock } from "./unblock";

function lens(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 400);
  camera.position.set(0, 1, 8);
  camera.lookAt(0, 1, 0);
  return camera;
}

describe("unblock", () => {
  const runner = new THREE.Vector3(0, 1, 0);

  it("hides a coin right between the lens and the runner", () => {
    expect(unblock(lens(), runner)(new THREE.Vector3(0, 1, 4))).toBe(0);
  });

  it("leaves coins beside the runner, behind them and behind the lens alone, but not against the lens", () => {
    const scale = unblock(lens(), runner);
    expect(scale(new THREE.Vector3(4, 1, 4))).toBe(1);
    expect(scale(new THREE.Vector3(0.5, 1.3, 7.5))).toBe(0);
    expect(scale(new THREE.Vector3(0, 1, -3))).toBe(1);
    expect(scale(new THREE.Vector3(0, 1, 10))).toBe(1);
  });

  it("eases a coin out as it nears the runner's outline", () => {
    const scale = unblock(lens(), runner);
    const edge = scale(new THREE.Vector3(0.62, 1, 4));
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(1);
  });
});
