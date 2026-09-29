import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CEREMONY } from "../../engine/ceremony";
import { CUP_TOP, ceremonyCamera } from "./ceremony-cam";

/** Where a point lands on the screen, -1 to 1 each way, from the ceremony camera at `t`. */
function onScreen(t: number, point: THREE.Vector3, aspect = 16 / 9): THREE.Vector3 {
  const place = ceremonyCamera(t, aspect);
  const camera = new THREE.PerspectiveCamera(place.fov, aspect, 0.1, 200);
  camera.position.set(place.pos.x, place.pos.y, place.pos.z);
  camera.lookAt(place.look.x, place.look.y, place.look.z);
  camera.updateMatrixWorld();
  return point.clone().project(camera);
}

const times = (from: number, to: number) => Array.from({ length: Math.round((to - from) / 0.25) + 1 }, (_, i) => from + i * 0.25);

describe("the ceremony camera", () => {
  it("keeps the raised cup under the names, which fill the top third, all through the shot", () => {
    for (const aspect of [16 / 9, 4 / 3, 21 / 9]) {
      for (const t of times(CEREMONY.up, 30)) {
        const top = onScreen(t, new THREE.Vector3(0, CUP_TOP, 0), aspect);
        expect(top.y).toBeLessThan(0.3);
        expect(top.y).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the captain in the picture from boots to cup once it is up", () => {
    for (const t of times(CEREMONY.up, 30)) {
      const feet = onScreen(t, new THREE.Vector3(0, 0, 0));
      expect(feet.y).toBeGreaterThan(-1);
      expect(Math.abs(feet.x)).toBeLessThan(0.9);
    }
  });

  it("opens close on the cup at the captain's chest", () => {
    for (const t of times(0, CEREMONY.raise)) {
      const cup = onScreen(t, new THREE.Vector3(0, 1.3, 0));
      expect(Math.abs(cup.x)).toBeLessThan(0.25);
      expect(Math.abs(cup.y)).toBeLessThan(0.3);
      const place = ceremonyCamera(t, 16 / 9);
      expect(Math.hypot(place.pos.x, place.pos.z)).toBeLessThan(3.6);
    }
  });

  it("moves the side to the left of the picture once the stats card is up on the right", () => {
    const before = onScreen(CEREMONY.stats - 1, new THREE.Vector3(0, 1, 0));
    expect(Math.abs(before.x)).toBeLessThan(0.1);
    for (const t of times(CEREMONY.stats + 1, 30)) expect(onScreen(t, new THREE.Vector3(0, 1, 0)).x).toBeLessThan(-0.25);
  });

  it("stays in front of the side, where the cameras are, never round the back", () => {
    for (const t of times(0, 60)) expect(ceremonyCamera(t, 16 / 9).pos.z).toBeGreaterThan(1.5);
  });
});
