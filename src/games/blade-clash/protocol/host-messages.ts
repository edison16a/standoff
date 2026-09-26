import { z } from "zod";
import { NAME_MAX } from "@/platform/profile";
import { CHARACTER_IDS } from "../characters";
import { MATCH_PHASES } from "./phase";

/** Messages the host sends to one phone or both. */

const slotSchema = z.union([z.literal(1), z.literal(2)]);
const pair = <T extends z.ZodType>(item: T) => z.tuple([item, item]);

/**
 * Everything a phone needs to draw its screen. The host sends a fresh copy
 * whenever something changes rather than patches, because it is small and
 * a phone that reconnects mid fight is then instantly up to date.
 */
export const controllerStateSchema = z.object({
  kind: z.literal("state"),
  phase: z.enum(MATCH_PHASES),
  health: pair(z.number().int().min(0)),
  maxHealth: z.number().int().min(1),
  /** What each player is called, as typed on their phone. */
  names: pair(z.string().max(NAME_MAX)),
  picks: pair(z.enum(CHARACTER_IDS).nullable()),
  ready: pair(z.boolean()),
  connected: pair(z.boolean()),
  /** Seats played by the computer. */
  computer: pair(z.boolean()),
  /** Whole seconds left in the countdown, when counting. */
  countdown: z.number().int().min(0).nullable(),
  rematchVotes: pair(z.boolean()),
  winner: slotSchema.nullable(),
});

/**
 * Something that just happened to this player's sword, so the phone can
 * buzz and flash it: they landed a hit, took one, or their blade clashed.
 */
export const feedbackSchema = z.object({
  kind: z.literal("feedback"),
  event: z.enum(["landed", "hurt", "clash"]),
});

export const hostMessageSchema = z.discriminatedUnion("kind", [controllerStateSchema, feedbackSchema]);

export type ControllerState = z.infer<typeof controllerStateSchema>;
export type FeedbackEvent = z.infer<typeof feedbackSchema>["event"];
export type HostMessage = z.infer<typeof hostMessageSchema>;
