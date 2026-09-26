/**
 * One skeleton for every fighter, in metres. Characters differ in what
 * they wear and wield, never in how they move, so every animation fits
 * all four. The proportions match the engine's hurtboxes: the head's
 * middle sits near 1.7 m and the chest fills 1 to 1.45 m.
 */
export const BODY = {
  thigh: 0.45,
  shin: 0.44,
  /** Ankle joint height above the sole. */
  ankle: 0.08,
  hipWidth: 0.2,
  /** Pelvis to the base of the neck. */
  torso: 0.5,
  neck: 0.09,
  shoulderWidth: 0.42,
  /** Shoulder joints sit this far below the base of the neck. */
  shoulderDrop: 0.06,
  upperArm: 0.31,
  forearm: 0.29,
  /** From the wrist to the middle of the fist, where the grip runs. */
  palm: 0.05,
} as const;

/** Standing tall, the pelvis sits this high. A fighting stance bends the knees a little. */
export const STAND_HEIGHT = BODY.thigh + BODY.shin + BODY.ankle;

/** R is the sword side (the fighter's right), L the free side. */
export const BONES = [
  "pelvis", "chest", "head",
  "upperArmR", "forearmR", "handR", "upperArmL", "forearmL", "handL",
  "thighR", "shinR", "footR", "thighL", "shinL", "footL",
  "sword",
] as const;
export type BoneName = (typeof BONES)[number];
