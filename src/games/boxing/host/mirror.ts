import * as THREE from "three";
import { LM, type Body, type MoveState } from "@/games/kit/camera";
import type { Hand } from "../engine/types";
import type { MirrorInput } from "../render/anim/anim-input";
import { FOREARM, UPPER_ARM } from "../render/models/arm";

const BOXER_ARM = UPPER_ARM + FOREARM;
/** A lean this far, in torso lengths, tips the boxer all the way over. */
const FULL_LEAN = 0.45;
/** A drop this far, in torso lengths, is a full duck. */
const FULL_CROUCH = 0.36;
const POINTS: Record<Hand, [number, number, number]> = {
  left: [LM.leftShoulder, LM.leftElbow, LM.leftWrist],
  right: [LM.rightShoulder, LM.rightElbow, LM.rightWrist],
};

/**
 * Turns a player's body from the camera into their boxer's arms, so the
 * boxer copies them like a mirror: the player's left glove is the boxer's
 * left glove, on the left of the screen. The camera's world points are
 * metres around the hips, y down and nearer the camera smaller z; the
 * boxer's own space has x to its left, y up and z toward the opponent,
 * so reaching at the camera reaches at the opponent. Each arm is resized
 * to the boxer's arm, so a short player and a tall one both reach full
 * extension.
 */
export function mirrorFrom(body: Body | null, moves: MoveState | null, out?: MirrorInput): MirrorInput | null {
  if (!body) return null;
  const result: MirrorInput = out ?? { reach: { left: null, right: null }, elbow: { left: null, right: null }, lean: 0, crouch: 0 };
  for (const hand of ["left", "right"] as const) {
    const [s, e, w] = POINTS[hand];
    const S = body.world[s]!;
    const E = body.world[e]!;
    const W = body.world[w]!;
    const seen = body.arms[hand].visible;
    const length = Math.hypot(E.x - S.x, E.y - S.y, E.z - S.z) + Math.hypot(W.x - E.x, W.y - E.y, W.z - E.z);
    if (!seen || length < 0.2) {
      result.reach[hand] = null;
      result.elbow[hand] = null;
      continue;
    }
    const k = BOXER_ARM / length;
    result.reach[hand] = toBoxer(W.x - S.x, W.y - S.y, W.z - S.z, k, result.reach[hand]);
    result.elbow[hand] = toBoxer(E.x - S.x, E.y - S.y, E.z - S.z, k, result.elbow[hand]);
  }
  // The kit measures a lean as the head right of the hips; the boxer leans toward its own left when positive.
  result.lean = clamp(-(moves?.amounts.lean ?? 0) / FULL_LEAN, -1, 1);
  result.crouch = clamp((moves?.amounts.drop ?? 0) / FULL_CROUCH, 0, 1);
  return result;
}

function toBoxer(dx: number, dy: number, dz: number, k: number, into: THREE.Vector3 | null): THREE.Vector3 {
  return (into ?? new THREE.Vector3()).set(-dx * k, -dy * k, -dz * k);
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}
