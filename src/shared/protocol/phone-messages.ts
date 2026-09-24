import { z } from "zod";
import { CHARACTER_IDS } from "../characters";

/**
 * Messages a phone sends to the host. The server validates each one
 * before relaying it, so the host can trust the shape.
 */

const finite = z.number().finite();

/**
 * The live controller reading, sent roughly 60 times a second.
 * Angles are radians relative to the pose captured when the player
 * calibrated, so "resting in guard" is zero on every axis.
 */
export const motionSchema = z.object({
  kind: z.literal("motion"),
  /** Blade elevation. Positive points the tip up. */
  pitch: finite.min(-Math.PI).max(Math.PI),
  /** Blade swing left or right of the strip line. */
  yaw: finite.min(-Math.PI).max(Math.PI),
  /** Twist of the wrist, only used for the hand art. */
  roll: finite.min(-Math.PI).max(Math.PI),
  /** Footwork intent from -1 (full retreat) to 1 (full advance). */
  move: finite.min(-1).max(1),
});

export const strikeSchema = z.object({
  kind: z.literal("strike"),
  action: z.enum(["jab", "parry"]),
});

export const pickSchema = z.object({
  kind: z.literal("pick"),
  characterId: z.enum(CHARACTER_IDS),
});

export const readySchema = z.object({
  kind: z.literal("ready"),
  ready: z.boolean(),
});

export const rematchSchema = z.object({ kind: z.literal("rematch") });

/** Ask for the computer as the opponent, or send it away again. */
export const soloSchema = z.object({ kind: z.literal("solo"), on: z.boolean() });

export const phoneMessageSchema = z.discriminatedUnion("kind", [
  motionSchema,
  strikeSchema,
  pickSchema,
  readySchema,
  rematchSchema,
  soloSchema,
]);

export type MotionMessage = z.infer<typeof motionSchema>;
export type StrikeAction = z.infer<typeof strikeSchema>["action"];
export type PhoneMessage = z.infer<typeof phoneMessageSchema>;
