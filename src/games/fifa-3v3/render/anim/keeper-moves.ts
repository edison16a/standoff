import { diveLayout } from "../../engine/dive";
import { KEEPER } from "../../engine/tuning";
import type { KeeperView } from "../../engine/view";
import { cheer } from "./celebrations";
import { getUp } from "./moves";
import { neutral, type Pose } from "./pose";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smooth = (v: number) => {
  const t = clamp(v, 0, 1);
  return t * t * (3 - 2 * t);
};

/** Lying on the turf after a dive. */
const FLAT = 1.45;

export interface KeeperFrame {
  pose: Pose;
  /** Where the feet are across the goal, in world z. The dive carries them toward the ball. */
  z: number;
}

/** The set position: crouched on the toes, gloves up and out, bouncing a little. */
function ready(time: number, moving: number): Pose {
  const p = neutral();
  const bob = Math.sin(time * 9) * 0.5 + 0.5;
  p.kneeL = p.kneeR = 0.55 + 0.08 * bob;
  p.hipLX = p.hipRX = -0.45;
  p.hipLZ = p.hipRZ = 0.2 + 0.18 * Math.abs(Math.sin(time * 11)) * moving;
  p.pitch = 0.22;
  p.lift = -0.07 - 0.02 * bob;
  p.shLX = p.shRX = -0.85;
  p.shLZ = p.shRZ = 0.55;
  p.elL = p.elR = -0.7;
  p.neckX = -0.2;
  return p;
}

/** Ball held to the chest, arms wrapped round it. */
function holding(): Pose {
  const p = neutral();
  p.shLX = p.shRX = -0.95;
  p.shLY = p.shRY = 0.45;
  p.shLZ = p.shRZ = 0.1;
  p.elL = p.elR = -1.5;
  p.kneeL = p.kneeR = 0.12;
  return p;
}

/** An underarm roll: the throwing arm swings through low as the keeper lunges. */
function throwing(t: number): Pose {
  const p = neutral();
  const swing = smooth(t / 0.3);
  p.shRX = 1.1 - 2.5 * swing;
  p.elR = -0.2;
  p.shLX = -0.6;
  p.shLZ = 0.6;
  p.pitch = 0.4 * Math.sin(Math.PI * clamp(t / 0.55, 0, 1));
  p.hipLX = -0.7 * swing;
  p.kneeL = 0.7 * swing;
  p.kneeR = 0.4;
  p.lift = -0.12 * swing;
  return p;
}

/**
 * A dive, laid out by the engine's diveLayout so the gloves meet the
 * ball: the body leans over toward it and leaves the ground, and once
 * down it settles flat on the turf.
 */
function diving(k: KeeperView, leftSign: number, time: number): KeeperFrame {
  const dive = k.dive!;
  const t = clamp((k.actionT - dive.wait) / dive.duration, 0, 1);
  const landed = k.actionT - dive.wait - dive.duration;
  const h = clamp(dive.height, 0.1, 2.6);
  if (dive.standing) {
    const p = holding();
    const reachUp = clamp((h - 1.1) / 0.8, -1, 1);
    p.shLX = p.shRX = -1.15 - reachUp * 0.9;
    p.kneeL = p.kneeR = h < 0.6 ? 1.1 : 0.25;
    p.lift = h < 0.6 ? -0.25 : 0;
    p.pitch = h < 0.6 ? 0.35 : 0;
    return { pose: p, z: k.z };
  }
  const { lean, leap, curl } = diveLayout(dive);
  const e = smooth(t);
  const fall = smooth(landed / 0.22);
  const p = neutral();
  p.roll = leftSign * (lean * e + (FLAT - lean) * fall);
  p.lift = leap * Math.sin((Math.PI / 2) * e) * (1 - fall) + 0.08 * fall;
  p.shLX = p.shRX = -2.9 * e + 0.8 * curl;
  p.shLZ = p.shRZ = 0.15 + 0.2 * curl;
  p.elL = p.elR = -0.2 - 1.2 * curl;
  p.spineZ = -leftSign * 0.25 * e;
  p.hipLZ = 0.35 * e;
  p.hipRZ = 0.15 * e;
  p.kneeL = 0.3 + 1.3 * curl;
  p.kneeR = 0.6 + 1.1 * curl;
  p.neckY = 0.05 * Math.sin(time);
  return { pose: p, z: k.z };
}

/** Rising from the turf after a dive, turning up about the middle of the body. */
function gettingUp(k: KeeperView, leftSign: number): KeeperFrame {
  const p = getUp(k.actionT, 0.7);
  const dive = k.dive;
  if (!dive || dive.standing) return { pose: p, z: k.z };
  const up = smooth(k.actionT / 0.35);
  p.roll = leftSign * FLAT * (1 - up);
  return { pose: p, z: k.z - dive.dir * KEEPER.middle * (1 - up) };
}

/**
 * The keeper's pose and footing. `leftSign` is -1 when the keeper's own
 * left points the way of the dive, so the roll tips the right way.
 */
export function keeperFrame(k: KeeperView, time: number, speed: number, leftSign: number): KeeperFrame {
  switch (k.action) {
    case "dive":
      if (k.dive) return diving(k, leftSign, time);
      return { pose: ready(time, 0), z: k.z };
    case "catch":
    case "hold":
      return { pose: holding(), z: k.z };
    case "throw":
      return { pose: throwing(k.actionT), z: k.z };
    case "getup":
      return gettingUp(k, leftSign);
    case "cheer":
      return { pose: cheer(k.actionT, 0.5), z: k.z };
    case "set":
      return { pose: ready(time, clamp(speed / 3, 0, 1)), z: k.z };
  }
}

