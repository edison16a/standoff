import { describe, expect, it } from "vitest";
import { quatFromDeviceEuler, rotate, vec, wrapAngle } from "@/games/kit/motion/math3d";

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe("quatFromDeviceEuler", () => {
  it("is the identity when the phone lies flat pointing north", () => {
    const v = rotate(quatFromDeviceEuler(0, 0, 0), vec(0, 1, 0));
    close(v.x, 0);
    close(v.y, 1);
    close(v.z, 0);
  });

  it("turns the top edge west when alpha is 90", () => {
    const v = rotate(quatFromDeviceEuler(90, 0, 0), vec(0, 1, 0));
    close(v.x, -1);
    close(v.y, 0);
  });

  it("tips the top edge up when beta is positive", () => {
    const v = rotate(quatFromDeviceEuler(0, 30, 0), vec(0, 1, 0));
    close(v.z, Math.sin(Math.PI / 6));
  });
});

describe("wrapAngle", () => {
  it("wraps into -π..π", () => {
    close(wrapAngle(3 * Math.PI / 2), -Math.PI / 2);
    close(wrapAngle(-3 * Math.PI / 2), Math.PI / 2);
  });
});
