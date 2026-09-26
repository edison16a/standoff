import { z } from "zod";
import { GUN_IDS } from "../engine/guns";

/**
 * Messages a phone sends to the host, besides the aim kit's own (whose
 * kinds start with "aim"). Phones send choices and raw input only; every
 * shot is decided on the host.
 */

export const gunPickSchema = z.object({ kind: z.literal("gun"), gun: z.enum(GUN_IDS) });

export const readySchema = z.object({ kind: z.literal("ready"), ready: z.boolean() });

/**
 * The shoot button going down or up. An automatic gun fires while it is
 * held; the aim kit's own fire message carries the exact aim of the press.
 */
export const triggerSchema = z.object({ kind: z.literal("trigger"), down: z.boolean() });

export const reloadSchema = z.object({ kind: z.literal("reload") });

/** Sent once as the phone's screen starts, so the host sends it everything even if earlier messages came too soon. */
export const helloSchema = z.object({ kind: z.literal("hello") });

export const phoneMessageSchema = z.discriminatedUnion("kind", [
  gunPickSchema,
  readySchema,
  triggerSchema,
  reloadSchema,
  helloSchema,
]);

export type PhoneMessage = z.infer<typeof phoneMessageSchema>;
