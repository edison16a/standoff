import { describe, expect, it } from "vitest";
import type { V2 } from "../vec";
import type { Approach, Threat } from "./approach";
import { steerLayup, type SteerFrame } from "./steer-layup";

const AP: Approach = {
  angle: "front", speed: 4, fast: true, distance: 2.6, hand: 1, threat: null, open: false, canDunk: true,
  putback: false, alley: false, bounce: 7, strength: 7, signature: "flush",
};
const MAN: Threat = { id: 3, dist: 1.2, spot: "path", lateral: 0.3, tall: false, up: false, edge: 0 };

/** Straight out in front of the rim, running at it (toward -z); the driver's right is +x. */
const FRONT: SteerFrame = { toRim: { x: 0, z: -1 }, off: 0.2 };
/** On the right wing: the rim is down and to the left. */
const WING: SteerFrame = { toRim: { x: -0.94, z: -0.33 }, off: 4 };

/** A stick this many degrees off the line to the rim, + toward the driver's right. */
function at(frame: SteerFrame, degrees: number): V2 {
  const r = (degrees * Math.PI) / 180;
  const f = frame.toRim;
  const right = { x: -f.z, z: f.x };
  return { x: f.x * Math.cos(r) + right.x * Math.sin(r), z: f.z * Math.cos(r) + right.z * Math.sin(r) };
}

const kind = (ap: Approach, stick: V2 | null, frame = FRONT) => steerLayup(ap, stick, frame, 1);

describe("steering a layup with the stick", () => {
  it("goes straight on with the stick at the rim", () => {
    expect(kind(AP, at(FRONT, 0))?.layup).toBe("finger");
    expect(kind({ ...AP, speed: 1.8 }, at(FRONT, 10))?.layup).toBe("power");
    expect(kind({ ...AP, angle: "side" }, at(WING, 5), WING)?.layup).toBe("glass");
  });

  it("euro steps a little off the line, to the side the stick points", () => {
    const right = kind(AP, at(FRONT, 40));
    expect(right?.layup).toBe("euro");
    expect(right?.side).toBe(1);
    expect(kind(AP, at(FRONT, -40))?.side).toBe(-1);
  });

  it("steps through under the rim with the stick across the line", () => {
    const left = kind(AP, at(FRONT, -90));
    expect(left?.layup).toBe("stepThrough");
    expect(left?.side).toBe(-1);
  });

  it("hops with the stick pulled back", () => {
    expect(kind(AP, at(FRONT, 170))?.layup).toBe("hop");
  });

  it("reverses under the backboard from the wing with the stick past the rim to the far baseline", () => {
    const pick = kind({ ...AP, angle: "side" }, { x: -0.6, z: -0.8 }, WING);
    expect(pick?.layup).toBe("reverse");
    expect(pick?.cross).toBe(-1);
    // Never from straight out front, where past the rim is just at it.
    expect(kind(AP, { x: -0.6, z: -0.8 })?.layup).not.toBe("reverse");
  });

  it("jukes the man in front with the stick let go, and leaves it to the game with nobody there", () => {
    const juke = kind({ ...AP, threat: MAN }, null);
    expect(juke?.layup).toBe("juke");
    // Away from him: he is on the right, so the jab goes left.
    expect(juke?.side).toBe(-1);
    expect(kind(AP, { x: 0.1, z: 0 })).toBeNull();
    expect(kind({ ...AP, threat: { ...MAN, spot: "trail", dist: 1 } }, null)).toBeNull();
  });
});
