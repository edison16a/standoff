import { z } from "zod";
import { BUILD_IDS } from "../builds";
import { CALLS } from "./host-messages";
import { playSchema } from "./playbook";

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

/** A tap on one of the QB's four throw buttons, by its place left to right: throw to that runner. Sent reliably. */
export const throwSchema = z.object({ kind: z.literal("throw"), slot: z.number().int().min(0).max(3) });

/**
 * The QB's finger held on a throw button, or slid off them all (null),
 * before he lets go: the host lights that runner up on the big screen.
 * Sent reliably, and only when it changes.
 */
export const highlightSchema = z.object({ kind: z.literal("highlight"), slot: z.number().int().min(0).max(3).nullable() });

export const phoneMessageSchema = z.discriminatedUnion("kind", [pickSchema, readySchema, helloSchema, callSchema, playSchema, kickSchema, throwSchema, highlightSchema]);

export type PhoneMessage = z.infer<typeof phoneMessageSchema>;

/** The gamepad's buttons, as named to the kit. Guard is held; the rest are pressed. Pass is the pitch on a run call; Run makes the QB a runner. */
export const PAD_BUTTONS = ["hike", "juke", "dive", "rush", "tackle", "guard", "pass", "run"] as const;
export type PadButton = (typeof PAD_BUTTONS)[number];

export function isPadButton(value: string): value is PadButton {
  return (PAD_BUTTONS as readonly string[]).includes(value);
}
