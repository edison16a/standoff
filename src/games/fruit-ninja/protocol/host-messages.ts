import { z } from "zod";
import { NAME_MAX } from "@/platform/profile";

/** Messages the host sends to one phone. */

export const HOST_PHASES = ["lobby", "countdown", "playing", "ending", "over"] as const;
export type HostPhase = (typeof HOST_PHASES)[number];

const seat = z.number().int().min(1).max(4);

export const standingSchema = z.object({ seat, name: z.string().max(NAME_MAX + 8), score: z.number().int() });
export type StandingRow = z.infer<typeof standingSchema>;

/**
 * Everything one phone needs to draw its screen. The host sends a fresh
 * copy to each phone when anything on it changes, rather than patches,
 * so a phone that reconnects mid round is instantly up to date.
 */
export const phoneStateSchema = z.object({
  kind: z.literal("state"),
  phase: z.enum(HOST_PHASES),
  /** Whether this phone plays in the current round. A late joiner waits for the next. */
  inRound: z.boolean(),
  score: z.number().int(),
  /** Place in the round, from 1, when playing. */
  rank: z.number().int().min(1).nullable(),
  /** People in the round. */
  players: z.number().int().min(0),
  secondsLeft: z.number().int().min(0),
  /** 3, 2, 1 during the countdown, else 0. */
  countdown: z.number().int().min(0),
  stunned: z.boolean(),
  /** Final standings, filled in once the round is over. */
  standings: z.array(standingSchema).max(4),
  winners: z.array(seat).max(4),
});

export type PhoneState = z.infer<typeof phoneStateSchema>;

/** A short buzz on the phone for something the player did. */
export const BUZZ_EVENTS = ["slice", "hit", "rare", "combo", "bomb"] as const;
export type BuzzEvent = (typeof BUZZ_EVENTS)[number];
export const buzzSchema = z.object({ kind: z.literal("buzz"), event: z.enum(BUZZ_EVENTS) });

export const hostMessageSchema = z.discriminatedUnion("kind", [phoneStateSchema, buzzSchema]);
export type HostMessage = z.infer<typeof hostMessageSchema>;
