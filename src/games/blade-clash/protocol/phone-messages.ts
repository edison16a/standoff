import { z } from "zod";
import { CHARACTER_IDS } from "../characters";

/**
 * Messages a phone sends to the host. The server validates each one
 * before relaying it, so the host can trust the shape.
 */

const angle = z.number().finite().min(-Math.PI).max(Math.PI);

/**
 * How the sword is held, sent roughly 60 times a second. Angles are
 * radians in the fighter's own frame, already mapped through the phone's
 * calibration, so the host only has to put the blade in the world.
 */
export const motionSchema = z.object({
  kind: z.literal("motion"),
  /** Blade turned to the fighter's right. */
  yaw: angle,
  /** Blade raised. */
  pitch: angle,
  /** Edge turned around the blade. */
  roll: angle,
  /** How far the arm is stretched toward the opponent, 0 to 1. */
  reach: z.number().finite().min(0).max(1),
  /** Footwork from the buttons: 1 forward, -1 back. */
  move: z.number().finite().min(-1).max(1),
});

/** Which calibration target this player is pointing at, so the big screen can show it in their half. */
export const CALIBRATION_STEPS = ["center", "top-left", "top-right", "bottom-right", "bottom-left", "guard", "test", "done"] as const;
export type CalibrationStep = (typeof CALIBRATION_STEPS)[number];
export const calibrationSchema = z.object({ kind: z.literal("calibrate"), step: z.enum(CALIBRATION_STEPS) });

export const pickSchema = z.object({
  kind: z.literal("pick"),
  characterId: z.enum(CHARACTER_IDS),
});

export const readySchema = z.object({
  kind: z.literal("ready"),
  ready: z.boolean(),
});

/** After a fight: play again, or everyone back to the menu. */
export const rematchSchema = z.object({ kind: z.literal("rematch") });
export const menuSchema = z.object({ kind: z.literal("menu") });

/** Ask for the computer as the opponent, or send it away again. */
export const soloSchema = z.object({ kind: z.literal("solo"), on: z.boolean() });

export const phoneMessageSchema = z.discriminatedUnion("kind", [
  motionSchema,
  calibrationSchema,
  pickSchema,
  readySchema,
  rematchSchema,
  menuSchema,
  soloSchema,
]);

export type MotionMessage = z.infer<typeof motionSchema>;
export type PhoneMessage = z.infer<typeof phoneMessageSchema>;
