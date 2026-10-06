import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { solveLeg } from "./leg-ik";

/** Where the ankle lands for some angles, built the way the rig turns its bones. */
function ankle(hx: number, hz: number, knee: number, thigh: number, shin: number): THREE.Vector3 {
  const hip = new THREE.Object3D();
  hip.rotation.set(hx, 0, hz);
  const k = new THREE.Object3D();
  k.position.set(0, -thigh, 0);
  k.rotation.set(knee, 0, 0);
  hip.add(k);
  const a = new THREE.Object3D();
  a.position.set(0, -shin, 0);
  k.add(a);
  hip.updateMatrixWorld(true);
  return a.getWorldPosition(new THREE.Vector3());
}

describe("leg reach", () => {
  it("puts the ankle on any point within reach", () => {
    const targets: [number, number, number][] = [[0, -0.8, 0.1], [0.12, -0.7, -0.25], [-0.1, -0.6, 0.35], [0.05, -0.88, 0], [0, -0.5, -0.4]];
    for (const [x, y, z] of targets) {
      const s = solveLeg(x, y, z, 0.45, 0.45);
      expect(s.short).toBe(0);
      expect(s.knee).toBeGreaterThanOrEqual(0);
      const at = ankle(s.hx, s.hz, s.knee, 0.45, 0.45);
      expect(at.distanceTo(new THREE.Vector3(x, y, z))).toBeLessThan(1e-4);
    }
  });

  it("reaches straight toward a point too far away and says by how much", () => {
    const s = solveLeg(0, -1.2, 0.2, 0.45, 0.45);
    expect(s.short).toBeGreaterThan(0.3);
    expect(s.knee).toBeLessThan(0.08);
    const at = ankle(s.hx, s.hz, s.knee, 0.45, 0.45);
    expect(at.clone().normalize().dot(new THREE.Vector3(0, -1.2, 0.2).normalize())).toBeGreaterThan(0.999);
  });
});
