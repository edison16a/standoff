import { z } from "zod";
import { CHARACTER_IDS } from "../roster";

/**
 * Messages a phone sends to the host, besides the gamepad kit's own
 * stick and button messages. Phones send choices and raw input only;
 * every decision in the match is the host's.
 */

export const pickSchema = z.object({ kind: z.literal("pick"), character: z.enum(CHARACTER_IDS) });

export const readySchema = z.object({ kind: z.literal("ready"), ready: z.boolean() });

/** Sent once as the phone's screen starts, so the host sends it everything even if earlier messages came too soon. */
export const helloSchema = z.object({ kind: z.literal("hello") });

export const phoneMessageSchema = z.discriminatedUnion("kind", [pickSchema, readySchema, helloSchema]);

export type PhoneMessage = z.infer<typeof phoneMessageSchema>;

/**
 * The gamepad's buttons, as named to the kit. Directions come from the
 * kit's stick: up is jump, and the direction held picks the move variant.
 */
export const BUTTONS = { attack: "attack", special: "special", ult: "ult" } as const;
export type ButtonName = (typeof BUTTONS)[keyof typeof BUTTONS];
