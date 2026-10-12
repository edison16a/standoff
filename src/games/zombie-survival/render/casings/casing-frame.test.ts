import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CASINGS, CasingBody, EJECT_HEIGHT, bounces, casingSeed } from "../../ballistics/casings";
import { Rng } from "../../engine/rng";
import { casingFrame, PORT_BLEND, portShare, toWorld } from "./casing-frame";
import { casingTurn } from "./casing-turn";

describe("the casing frame", () => {
  it("lays the port's direction level on the street and keeps it right handed", () => {
    // A gun tipped up and rolled: its right still points mostly right.
    const frame = casingFrame({ x: 0.9, y: 0.3, z: 0.2 });
    const x = new THREE.Vector3(frame.x.x, frame.x.y, frame.x.z);
    const z = new THREE.Vector3(frame.z.x, frame.z.y, frame.z.z);
    expect(x.y).toBe(0);
    expect(x.length()).toBeCloseTo(1);
    expect(z.length()).toBeCloseTo(1);
    expect(x.dot(z)).toBeCloseTo(0);
    // Right crossed with up points back toward the shooter.
    expect(x.clone().cross(new THREE.Vector3(0, 1, 0)).distanceTo(z)).toBeCloseTo(0);
  });

  it("throws cases to the shooter's right when the view looks down the street", () => {
    const frame = casingFrame({ x: 1, y: 0, z: 0 });
    const out = toWorld(frame, { x: 10, y: 0, z: 5 }, { x: 1, y: 0.5, z: 0.2 }, { x: 0, y: 0, z: 0 });
    expect(out).toEqual({ x: 11, y: 0.5, z: 5.2 });
  });

  it("copes with a gun pointing straight up", () => {
    const frame = casingFrame({ x: 0, y: 1, z: 0 });
    expect(Math.hypot(frame.x.x, frame.x.z)).toBeCloseTo(1);
  });

  it("starts the drawn case at the real port and lets go of it quickly", () => {
    expect(portShare(0)).toBe(1);
    expect(portShare(PORT_BLEND / 2)).toBeCloseTo(0.5);
    expect(portShare(PORT_BLEND)).toBe(0);
  });
});

describe("cases in the picture and in the sound", () => {
  it("bounce at the same moments from the same seed", () => {
    const seed = casingSeed(2, 41);
    const heard = bounces(CASINGS.rifle, EJECT_HEIGHT, (() => { const r = new Rng(seed); return () => r.next(); })());
    // The renderer builds its case the same way and steps it one fixed step at a time.
    const rng = new Rng(seed);
    const random = () => rng.next();
    const body = new CasingBody(CASINGS.rifle, EJECT_HEIGHT, random);
    const seen: number[] = [];
    while (!body.resting && body.age < 3) {
      const hit = body.step(random);
      if (hit) seen.push(hit.time);
    }
    expect(seen).toEqual(heard.map((b) => b.time));
  });
});

describe("the casing's turn", () => {
  it("lies flat across its roll on the ground", () => {
    const q = casingTurn(true, 0, 0, 0, 0, new THREE.Quaternion());
    const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    expect(Math.abs(axis.y)).toBeLessThan(1e-9);
  });

  it("lies flat in the air at a quarter turn, where the physics lands it", () => {
    const q = casingTurn(false, 0.7, Math.PI / 2, 0, 0, new THREE.Quaternion());
    const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    expect(Math.abs(axis.y)).toBeLessThan(1e-9);
  });
});
