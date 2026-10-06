import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { neutral } from "../anim/pose";
import { BodyDynamics } from "./body-dynamics";

const DT = 1 / 60;

/** Runs a body along a path for a while, facing the way it moves, and returns its lean. */
function lean(path: (t: number) => { x: number; z: number }, seconds: number) {
  const d = new BodyDynamics(0);
  let last = path(0);
  for (let t = DT; t <= seconds; t += DT) {
    const at = path(t);
    d.track(at.x, at.z, Math.atan2(at.z - last.z, at.x - last.x), DT);
    last = at;
  }
  const p = neutral();
  d.lean(p, 1);
  return p;
}

describe("BodyDynamics", () => {
  it("leans into the run when speeding up and sits back when braking", () => {
    const speeding = lean((t) => ({ x: 2 * t * t, z: 0 }), 1);
    expect(speeding.pitch).toBeGreaterThan(0.05);
    const braking = lean((t) => ({ x: 8 * t - 3 * t * t, z: 0 }), 1);
    expect(braking.pitch).toBeLessThan(-0.05);
    expect(braking.shLX).toBeLessThan(0);
  });

  it("banks into a turn: a left turn tips the body left, which is a negative roll", () => {
    // Running anticlockwise round a circle seen from above (+y): the centre is on the runner's left.
    const left = lean((t) => ({ x: 6 * Math.cos(t), z: -6 * Math.sin(t) }), 1.5);
    const right = lean((t) => ({ x: 6 * Math.cos(t), z: 6 * Math.sin(t) }), 1.5);
    expect(Math.sign(left.roll)).toBe(-Math.sign(right.roll));
    expect(Math.abs(left.roll)).toBeGreaterThan(0.2);
  });

  it("starts afresh after a jump across the pitch instead of lurching", () => {
    const p = lean((t) => (t < 0.5 ? { x: 0, z: 0 } : { x: 20, z: 5 }), 0.52);
    expect(Math.abs(p.pitch)).toBeLessThan(1e-6);
    expect(Math.abs(p.roll)).toBeLessThan(1e-6);
  });

  it("breathes harder after a sprint", () => {
    const rest = new BodyDynamics(Math.PI / 2);
    const tired = new BodyDynamics(Math.PI / 2);
    for (let t = 0; t < 6; t += DT) tired.track(8 * t, 0, 0, DT);
    const a = new THREE.Object3D();
    const b = new THREE.Object3D();
    let deepest = [0, 0];
    for (let t = 0; t < 4; t += DT) {
      rest.track(0, 0, 0, DT);
      tired.track(48 + 8 * t, 0, 0, DT);
      rest.swell(a);
      tired.swell(b);
      deepest = [Math.max(deepest[0]!, a.scale.z - 1), Math.max(deepest[1]!, b.scale.z - 1)];
    }
    expect(deepest[1]!).toBeGreaterThan(deepest[0]! * 1.8);
  });
});
