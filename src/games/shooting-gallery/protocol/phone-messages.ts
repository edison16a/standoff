import { z } from "zod";
import { FINISH_IDS } from "../render/models/finishes";

/**
 * Messages a phone sends to the host. Aiming and trigger pulls travel as
 * the aim kit's own messages, so these are only the setup choices.
 */

export const SETUP_STEPS = ["calibrate", "gun", "ready"] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

/** Which setup page the phone is on, so the lobby can say who is still getting set. */
export const setupSchema = z.object({ kind: z.literal("setup"), step: z.enum(SETUP_STEPS) });

/** The finish this player picked for their gun. */
export const gunSchema = z.object({ kind: z.literal("gun"), finish: z.enum(FINISH_IDS) });

/** Ready for the next round, or not any more. Also "play again" from the results. */
export const readySchema = z.object({ kind: z.literal("ready"), ready: z.boolean() });

export const phoneMessageSchema = z.discriminatedUnion("kind", [setupSchema, gunSchema, readySchema]);
export type PhoneMessage = z.infer<typeof phoneMessageSchema>;
