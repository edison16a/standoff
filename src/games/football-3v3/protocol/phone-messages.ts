import { z } from "zod";
import { BUILD_IDS } from "../builds";
import { CALLS } from "./host-messages";

/**
 * Messages a phone sends to the host, besides the gamepad kit's own
 * stick and button messages. Phones send choices and raw input only;
 * every decision in the match is the host's.
 */

const axis = z.number().min(-1).max(1);

export const pickSchema = z.object({ kind: z.literal("pick"), build: z.enum(BUILD_IDS) });

export const readySchema = z.object({ kind: z.literal("ready"), ready: z.boolean() });

/** Sent once as the phone's screen starts, so the host sends it everything even if earlier messages came too soon. */
export const helloSchema = z.object({ kind: z.literal("hello") });

/** The QB's pick before a play: throw, run or kick, and after a touchdown kick or two. */
export const callSchema = z.object({ kind: z.literal("call"), call: z.enum(CALLS) });

/**
 * A tap on the kick meter, with the reading the phone drew at that
 * instant, so the kick goes where the player saw the marker whatever
 * the network did in between.
 */
export const kickSchema = z.object({ kind: z.literal("kick"), value: axis });

/** The throw stick while held, on the screen's axes: x right and y up. Sent often and allowed to drop. */
export const aimSchema = z.object({ kind: z.literal("aim"), x: axis, y: axis });

/**
 * The throw stick let go: throw at the receiver it was on. Sent reliably,
 * with how long the throw meter ran on this phone, so the grade is what
 * the player saw whatever the network did.
 */
export const throwSchema = z.object({ kind: z.literal("throw"), x: axis, y: axis, heldMs: z.number().finite().min(0).max(60000).optional() });

/** A thumb down on the throw stick starts the throw meter; up without a throw stops it. Sent reliably. */
export const holdSchema = z.object({ kind: z.literal("hold"), down: z.boolean() });

export const phoneMessageSchema = z.discriminatedUnion("kind", [pickSchema, readySchema, helloSchema, callSchema, kickSchema, aimSchema, throwSchema, holdSchema]);

export type PhoneMessage = z.infer<typeof phoneMessageSchema>;

/** The gamepad's buttons, as named to the kit. Guard is held; the rest are pressed. Pass is the pitch on a run call; Run makes the QB a runner. */
export const PAD_BUTTONS = ["hike", "juke", "dive", "rush", "tackle", "guard", "pass", "run"] as const;
export type PadButton = (typeof PAD_BUTTONS)[number];

export function isPadButton(value: string): value is PadButton {
  return (PAD_BUTTONS as readonly string[]).includes(value);
}
