import { describe, expect, it } from "vitest";
import { quatFromDeviceEuler } from "./math3d";
import { calibrate, stripAxis, swordPose } from "./sword-pose";

const DEG = Math.PI / 180;

describe("sword pose", () => {
  it("raises the blade when a phone held flat tips its top edge up", () => {
    const guard = calibrate(quatFromDeviceEuler(0, 0, 0));
    const pose = swordPose(quatFromDeviceEuler(0, 25, 0), guard);
    expect(pose.pitch).toBeCloseTo(25 * DEG, 4);
    expect(pose.yaw).toBeCloseTo(0, 4);
  });

  it("works just the same for a phone held upright like a hilt", () => {
    // Upright: top edge to the sky, back of the phone facing north.
    const guard = calibrate(quatFromDeviceEuler(0, 90, 0));
    expect(swordPose(quatFromDeviceEuler(0, 90, 0), guard).pitch).toBeCloseTo(0, 4);
    // Leaning the top back toward the player tips the back of the phone, the blade, upward.
    const tipped = swordPose(quatFromDeviceEuler(0, 110, 0), guard);
    expect(tipped.pitch).toBeCloseTo(20 * DEG, 3);
    expect(stripAxis(guard).y).toBeCloseTo(1, 4);
  });

  it("measures swing left and right from the calibrated heading", () => {
    const guard = calibrate(quatFromDeviceEuler(40, 0, 0));
    const pose = swordPose(quatFromDeviceEuler(55, 0, 0), guard);
    expect(Math.abs(pose.yaw)).toBeCloseTo(15 * DEG, 4);
  });

  it("reports the wrist turning without moving the blade", () => {
    const guard = calibrate(quatFromDeviceEuler(0, 0, 0));
    const pose = swordPose(quatFromDeviceEuler(0, 0, 30), guard);
    expect(pose.pitch).toBeCloseTo(0, 4);
    expect(Math.abs(pose.roll)).toBeCloseTo(30 * DEG, 3);
  });
});
