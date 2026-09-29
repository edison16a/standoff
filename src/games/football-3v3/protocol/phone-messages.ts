import { z } from "zod";
import { CHARACTER_IDS } from "../roster";
import { CALLS } from "./host-messages";

/**
 * Messages a phone sends to the host, besides the gamepad kit's own
 * stick and button messages. Phones send choices and raw input only;
 * every decision in the match is the host's.
 */

const axis = z.number().min(-1).max(1);

export const pickSchema = z.object({ kind: z.literal("pick"), character: z.enum(CHARACTER_IDS) });

export const readySchema = z.object({ kind: z.literal("ready"), ready: z.boolean() });

/** Sent once as the phone's screen starts, so the host sends it everything even if earlier messages came too soon. */
export const helloSchema = z.object({ kind: z.literal("hello") });

/** The QB's pick before a play: throw or kick, and after a touchdown kick or two. */
export const callSchema = z.object({ kind: z.literal("call"), call: z.enum(CALLS) });

/**
 * A tap on the kick meter, with the reading the phone drew at that
 * instant, so the kick goes where the player saw the marker whatever
 * the network did in between.
 */
export const kickSchema = z.object({ kind: z.literal("kick"), value: axis });

/** The throw stick while held, on the screen's axes: x right and y up. Sent often and allowed to drop. */
export const aimSchema = z.object({ kind: z.literal("aim"), x: axis, y: axis });

/** The throw stick let go: throw at the receiver it was on. Sent reliably. */
export const throwSchema = z.object({ kind: z.literal("throw"), x: axis, y: axis });

export const phoneMessageSchema = z.discriminatedUnion("kind", [pickSchema, readySchema, helloSchema, callSchema, kickSchema, aimSchema, throwSchema]);

export type PhoneMessage = z.infer<typeof phoneMessageSchema>;

/** The gamepad's buttons, as named to the kit. Guard is held; the rest are pressed. */
export const PAD_BUTTONS = ["hike", "juke", "dive", "rush", "tackle", "guard"] as const;
export type PadButton = (typeof PAD_BUTTONS)[number];

export function isPadButton(value: string): value is PadButton {
  return (PAD_BUTTONS as readonly string[]).includes(value);
}
