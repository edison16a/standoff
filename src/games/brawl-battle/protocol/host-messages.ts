import { z } from "zod";
import { CHARACTER_IDS } from "../roster";

/** Where the room is, as a phone sees it. */
export const PHASES = ["lobby", "countdown", "fight", "game", "results"] as const;
export type RoomPhase = (typeof PHASES)[number];

/**
 * Everything one phone needs to draw its screen. The host sends each
 * phone its own copy whenever something on it changed, rather than
 * patches, because it is small and a phone that reconnects mid match is
 * then instantly up to date.
 */
export const phoneStateSchema = z.object({
  kind: z.literal("state"),
  phase: z.enum(PHASES),
  pick: z.enum(CHARACTER_IDS).nullable(),
  ready: z.boolean(),
  /** False for a phone that joined mid match and waits for the next one. */
  playing: z.boolean(),
  /** Damage carried, in whole percent. */
  percent: z.number().int().min(0).max(999),
  stocks: z.number().int().min(0).max(9),
  /** The ult meter, 0 to 1. Full means the Ult button works. */
  ult: z.number().min(0).max(1),
  /** Out of lives but the match goes on. */
  out: z.boolean(),
  /** Rivals this player knocked off the stage. */
  kos: z.number().int().min(0).max(99),
  /** Set once the match is decided, for players in it. 1 is the winner. */
  place: z.number().int().min(1).max(4).nullable(),
  /** A word for the moment, like Fight or KO. */
  banner: z.string().max(24).nullable(),
});

export const BUZZ_KINDS = ["hit", "hurt", "ko", "fall", "ult", "win", "lose"] as const;
export type BuzzKind = (typeof BUZZ_KINDS)[number];

/** Asks a phone to buzz, on hardware that allows it. */
export const buzzSchema = z.object({ kind: z.literal("buzz"), event: z.enum(BUZZ_KINDS) });

export const hostMessageSchema = z.discriminatedUnion("kind", [phoneStateSchema, buzzSchema]);

export type PhoneState = z.infer<typeof phoneStateSchema>;
export type HostMessage = z.infer<typeof hostMessageSchema>;
