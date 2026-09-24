import { z } from "zod";
import { BLADE_IDS } from "../blades";

/**
 * Messages a phone sends to the host. The aim itself travels on the aim
 * kit's own messages (kinds starting with "aim"), so these are only the
 * player's choices. None of them may start with "aim", and "profile" and
 * "players" belong to the platform.
 */

/** Which setup page the player is on, so the lobby can show who is nearly there. */
export const SETUP_STEPS = ["calibrate", "blade", "ready"] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

export const setupSchema = z.object({ kind: z.literal("setup"), step: z.enum(SETUP_STEPS) });

export const bladeChoiceSchema = z.object({ kind: z.literal("blade"), blade: z.enum(BLADE_IDS) });

/** Ready to play: set up and waiting for the host to press Start. */
export const readySchema = z.object({ kind: z.literal("ready"), ready: z.boolean() });

export const phoneMessageSchema = z.discriminatedUnion("kind", [setupSchema, bladeChoiceSchema, readySchema]);

export type PhoneMessage = z.infer<typeof phoneMessageSchema>;
