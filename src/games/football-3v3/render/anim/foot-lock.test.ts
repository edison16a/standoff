import { describe, expect, it } from "vitest";
import { FootLock, type FootFrame, type V3 } from "./foot-lock";
import { dutyFactor, strideLength } from "./gait";

const ANKLE = 0.085;
const LEG = 0.9;

/** A body running along +z, its feet where a stride would put them, without any lock. */
function running(z: number, phase: number, speed: number): [V3, V3] {
  const stride = strideLength(speed, LEG);
  const foot = (offset: number) => ({ x: offset > 0 ? 0.1 : -0.1, y: ANKLE + 0.1 * Math.max(0, Math.sin(phase * Math.PI * 2 + offset)), z: z + 0.12 * stride * Math.sin(phase * Math.PI * 2 + offset) });
  return [foot(1), foot(-1)];
}

describe("planted feet", () => {
  it("holds each foot still on the turf for its whole stance at any pace", () => {
    for (const speed of [1.4, 4, 8.5]) {
      const lock = new FootLock();
      const stride = strideLength(speed, LEG);
      let z = 0;
      let phase = 0;
      const held: (V3 | null)[] = [null, null];
      let locks = 0;
      for (let f = 0; f < 240; f++) {
        const dt = 1 / 60;
        z += speed * dt;
        phase = (phase + (speed * dt) / stride) % 1;
        const frame: FootFrame = { mode: "gait", phase, duty: dutyFactor(speed), speed, fk: running(z, phase, speed), ankle: ANKLE, yaw: 0 };
        lock.update(frame, dt);
        lock.feet.forEach((foot, i) => {
          if (!foot.locked) return void (held[i] = null);
          if (!held[i]) {
            held[i] = { ...foot.at };
            locks++;
          }
          expect(foot.at).toEqual(held[i]);
          expect(foot.at.y).toBe(ANKLE);
        });
      }
      // Four seconds of running plants each foot many times.
      expect(locks).toBeGreaterThan(4);
    }
  });

  it("never has both feet down for long in a sprint, and always one down walking", () => {
    const both = (speed: number) => {
      const lock = new FootLock();
      let phase = 0;
      let none = 0;
      for (let f = 0; f < 300; f++) {
        phase = (phase + 1 / 60 / (strideLength(speed, LEG) / speed)) % 1;
        lock.update({ mode: "gait", phase, duty: dutyFactor(speed), speed, fk: running(0, phase, speed), ankle: ANKLE, yaw: 0 }, 1 / 60);
        if (!lock.feet[0].locked && !lock.feet[1].locked) none++;
      }
      return none / 300;
    };
    expect(both(1.3)).toBe(0);
    // Sprinting, both feet are in the air between steps for a good part of the stride.
    expect(both(9)).toBeGreaterThan(0.25);
  });

  it("standing, steps a foot back under the body when it turns, one foot at a time", () => {
    const lock = new FootLock();
    let stepped = 0;
    for (let f = 0; f < 120; f++) {
      const yaw = Math.min(1.4, f * 0.03);
      const fk: [V3, V3] = [
        { x: Math.cos(yaw) * 0.12, y: ANKLE, z: -Math.sin(yaw) * 0.12 },
        { x: -Math.cos(yaw) * 0.12, y: ANKLE, z: Math.sin(yaw) * 0.12 },
      ];
      lock.update({ mode: "gait", phase: 0, duty: 0.6, speed: 0, fk, ankle: ANKLE, yaw }, 1 / 60);
      const [l, r] = lock.feet;
      expect(!!l.step && !!r.step).toBe(false);
      if (l.step || r.step) stepped++;
    }
    expect(stepped).toBeGreaterThan(10);
  });

  it("lets go of both feet for a dive or a fall, and holds the push off foot in a juke", () => {
    const lock = new FootLock();
    const fk: [V3, V3] = [{ x: 0.1, y: ANKLE, z: 0 }, { x: -0.1, y: ANKLE, z: 0 }];
    for (let f = 0; f < 30; f++) lock.update({ mode: "gait", phase: 0, duty: 0.6, speed: 0, fk, ankle: ANKLE, yaw: 0 }, 1 / 60);
    expect(lock.feet[0].weight).toBeGreaterThan(0.9);
    for (let f = 0; f < 60; f++) lock.update({ mode: "free", phase: 0, duty: 0.6, speed: 0, fk, ankle: ANKLE, yaw: 0 }, 1 / 60);
    expect(lock.feet[0].weight).toBe(0);
    for (let f = 0; f < 10; f++) lock.update({ mode: "plantR", phase: 0, duty: 0.3, speed: 6, fk, ankle: ANKLE, yaw: 0 }, 1 / 60);
    expect(lock.feet[1].locked).toBe(true);
    expect(lock.feet[0].locked).toBe(false);
  });
});
