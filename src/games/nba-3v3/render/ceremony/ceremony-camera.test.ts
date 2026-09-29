import { describe, expect, it } from "vitest";
import { CEREMONY, CEREMONY_SPOT } from "../../engine/ceremony";
import { ceremonyCamera, CRANE_END, TROPHY_TOP, type CameraPlace } from "./ceremony-camera";

/** Where a point lands up the screen, -1 bottom to 1 top, for a camera with no roll. */
function screenY(cam: CameraPlace, p: { x: number; y: number; z: number }): number {
  const fx = cam.look.x - cam.pos.x;
  const fy = cam.look.y - cam.pos.y;
  const fz = cam.look.z - cam.pos.z;
  const pitch = Math.atan2(fy, Math.hypot(fx, fz));
  const flat = Math.hypot(p.x - cam.pos.x, p.z - cam.pos.z);
  const to = Math.atan2(p.y - cam.pos.y, flat);
  return Math.tan(to - pitch) / Math.tan((cam.fov * Math.PI) / 360);
}

const gap = (a: CameraPlace, b: CameraPlace) => Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y, a.pos.z - b.pos.z);

describe("ceremony camera", () => {
  it("stays in front of the team the whole time", () => {
    for (let t = 0; t < 40; t += 0.25) expect(ceremonyCamera(t).pos.z).toBeGreaterThan(CEREMONY_SPOT.z + 2.5);
  });

  it("keeps the raised trophy in the picture, under the names at the top", () => {
    for (let t = CEREMONY.up + 1.5; t < 40; t += 0.5) {
      const y = screenY(ceremonyCamera(t), { x: CEREMONY_SPOT.x, y: TROPHY_TOP, z: CEREMONY_SPOT.z });
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(0.35);
    }
  });

  it("glides from the crane into the orbit without a jump", () => {
    expect(gap(ceremonyCamera(CRANE_END - 0.01), ceremonyCamera(CRANE_END + 0.01))).toBeLessThan(0.05);
  });
});
