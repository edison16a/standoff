import * as THREE from "three";
import type { Hand } from "../../engine/types";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export interface HandPose {
  target: THREE.Vector3;
  pole: THREE.Vector3;
}

type Pair = Record<Hand, HandPose>;

/**
 * Where the wrists go for each held position, against the chest joint
 * (x to the boxer's left, y up, z forward), so the gloves stay by the
 * face when the boxer ducks, leans or twists. Poles are where the elbows
 * point.
 */
export const CHEST_POSES = {
  /** The fighting guard: lead glove out in front, rear glove by the chin. */
  guard: {
    left: { target: v(0.12, 0.4, 0.34), pole: v(0.5, -0.15, 0.2) },
    right: { target: v(-0.07, 0.41, 0.23), pole: v(-0.45, -0.2, 0.05) },
  },
  /** Covered up: both gloves in front of the face, elbows tucked over the ribs. */
  block: {
    left: { target: v(0.07, 0.43, 0.2), pole: v(0.12, -0.3, 0.45) },
    right: { target: v(-0.07, 0.43, 0.2), pole: v(-0.12, -0.3, 0.45) },
  },
  /** Hurt: the gloves sag to the chest. */
  sag: {
    left: { target: v(0.14, 0.14, 0.3), pole: v(0.5, -0.4, 0) },
    right: { target: v(-0.12, 0.12, 0.28), pole: v(-0.5, -0.4, 0) },
  },
  /** Both arms up in victory. */
  cheer: {
    left: { target: v(0.3, 0.92, 0.12), pole: v(0.9, 0.4, -0.1) },
    right: { target: v(-0.3, 0.92, 0.12), pole: v(-0.9, 0.4, -0.1) },
  },
  /** Beaten on points: arms hanging. */
  slump: {
    left: { target: v(0.24, -0.2, 0.08), pole: v(0.5, 0.2, -0.3) },
    right: { target: v(-0.24, -0.2, 0.08), pole: v(-0.5, 0.2, -0.3) },
  },
} satisfies Record<string, Pair>;

/** Against the model's root: resting on the top ropes in the corner, forearms on the knees on the stool, and flat out on the canvas. */
export const ROOT_POSES = {
  ropes: {
    left: { target: v(0.62, 1.22, -0.3), pole: v(1, 1.2, 0.2) },
    right: { target: v(-0.62, 1.22, -0.3), pole: v(-1, 1.2, 0.2) },
  },
  knees: {
    left: { target: v(0.2, 0.7, 0.4), pole: v(0.55, 0.9, 0.05) },
    right: { target: v(-0.2, 0.7, 0.4), pole: v(-0.55, 0.9, 0.05) },
  },
  fallen: {
    left: { target: v(0.55, 0.12, -1.05), pole: v(1.2, 0.3, -0.5) },
    right: { target: v(-0.5, 0.1, -0.95), pole: v(-1.2, 0.3, -0.5) },
  },
} satisfies Record<string, Pair>;

/** Blends one hand pose toward another, in place. */
export function blendHand(into: HandPose, toward: HandPose, t: number): HandPose {
  if (t <= 0) return into;
  into.target.lerp(toward.target, Math.min(1, t));
  into.pole.lerp(toward.pole, Math.min(1, t));
  return into;
}

export function cloneHand(pose: HandPose): HandPose {
  return { target: pose.target.clone(), pole: pose.pole.clone() };
}
