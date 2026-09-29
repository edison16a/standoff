import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { stickToField } from "./steer";

/** Where a field point lands on screen for a camera looking along `forward`, x right and y up. */
function onScreen(forward: { x: number; z: number }, field: { x: number; z: number }): { x: number; y: number } {
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 500);
  camera.position.set(-forward.x * 10, 8, -forward.z * 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const a = new THREE.Vector3(0, 0, 0).project(camera);
  const b = new THREE.Vector3(field.x, 0, field.z).project(camera);
  return { x: b.x - a.x, y: b.y - a.y };
}

describe("steering by the camera", () => {
  const forwards = [
    { x: 1, z: 0 },
    { x: -1, z: 0 },
    { x: Math.SQRT1_2, z: Math.SQRT1_2 },
  ];

  it("runs up the screen when the stick is pushed up", () => {
    for (const f of forwards) {
      const move = stickToField({ x: 0, y: 1 }, f);
      const screen = onScreen(f, move);
      expect(screen.y).toBeGreaterThan(0.01);
      expect(Math.abs(screen.x)).toBeLessThan(1e-6);
    }
  });

  it("runs right across the screen when the stick is pushed right", () => {
    for (const f of forwards) {
      const screen = onScreen(f, stickToField({ x: 1, y: 0 }, f));
      expect(screen.x).toBeGreaterThan(0.01);
      expect(Math.abs(screen.y)).toBeLessThan(1e-6);
    }
  });

  it("keeps the stick's length", () => {
    const move = stickToField({ x: 0.3, y: -0.4 }, { x: 0, z: 1 });
    expect(Math.hypot(move.x, move.z)).toBeCloseTo(0.5, 6);
  });
});
