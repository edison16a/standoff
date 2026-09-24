import { z } from "zod";
import { CHARACTER_IDS } from "../characters";

/**
 * Messages a phone sends to the host. Phones send raw input only. Every
 * decision (who got hit, who won) is the host's.
 */

/** The wheel and pedals, streamed about 30 times a second and on every change. */
export const inputSchema = z.object({
  kind: z.literal("input"),
  /** -1 full left to 1 full right. */
  steer: z.number().finite().min(-1).max(1),
  drive: z.boolean(),
  brake: z.boolean(),
});

/** Fire the held power up. */
export const useSchema = z.object({ kind: z.literal("use") });

export const pickSchema = z.object({ kind: z.literal("pick"), character: z.enum(CHARACTER_IDS) });

export const readySchema = z.object({ kind: z.literal("ready"), ready: z.boolean() });

/** Sent once as the phone's screen starts, so the host sends it everything, even if earlier messages came too soon. */
export const helloSchema = z.object({ kind: z.literal("hello") });

export const phoneMessageSchema = z.discriminatedUnion("kind", [inputSchema, useSchema, pickSchema, readySchema, helloSchema]);

export type InputMessage = z.infer<typeof inputSchema>;
export type PhoneMessage = z.infer<typeof phoneMessageSchema>;
