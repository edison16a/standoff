import { z } from "zod";
import { CHARACTER_IDS } from "../roster";

/**
 * Messages a phone sends to the host. The stick and the buttons travel
 * through the gamepad kit (its kinds start with "pad"); these carry the
 * setup choices and the shot release timing.
 */

export const pickSchema = z.object({ kind: z.literal("pick"), character: z.enum(CHARACTER_IDS) });

export const readySchema = z.object({ kind: z.literal("ready"), ready: z.boolean() });

/** Sent as the phone's screen starts, so the host sends it everything even if earlier messages came too soon. */
export const helloSchema = z.object({ kind: z.literal("hello") });

/**
 * Shoot let go, with how long the phone saw it held. The phone measures
 * the hold itself, so network lag never turns a green release late.
 */
export const releaseSchema = z.object({ kind: z.literal("release"), heldMs: z.number().finite().min(0).max(5000) });

export const phoneMessageSchema = z.discriminatedUnion("kind", [pickSchema, readySchema, helloSchema, releaseSchema]);

export type PhoneMessage = z.infer<typeof phoneMessageSchema>;
