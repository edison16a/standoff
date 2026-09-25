import { z } from "zod";
import { CHARACTER_IDS } from "../roster";

/** Where the room is, as a phone sees it. */
export const PHASES = ["lobby", "kickoff", "play", "goal", "replay", "restart", "fulltime"] as const;
export type RoomPhase = (typeof PHASES)[number];

const team = z.union([z.literal(0), z.literal(1)]);

/**
 * Everything one phone needs to draw its screen. The host sends each
 * phone its own copy whenever something on it changed, rather than
 * patches, because it is small and a phone that reconnects mid match is
 * then instantly up to date.
 */
export const phoneStateSchema = z.object({
  kind: z.literal("state"),
  phase: z.enum(PHASES),
  /** Stars other connected players already have. */
  taken: z.array(z.enum(CHARACTER_IDS)),
  pick: z.enum(CHARACTER_IDS).nullable(),
  ready: z.boolean(),
  /** The side the host put this player on, or null while unassigned. */
  team: team.nullable(),
  /** False for a phone that joined mid match and waits for the next one. */
  playing: z.boolean(),
  score: z.tuple([z.number().int().min(0).max(99), z.number().int().min(0).max(99)]),
  /** Whole seconds left on the clock. */
  clock: z.number().int().min(0).max(999),
  golden: z.boolean(),
  hasBall: z.boolean(),
  goals: z.number().int().min(0).max(99),
  /** Set at the final whistle for players in the match. */
  result: z.enum(["win", "lose"]).nullable(),
  /** A word for the moment, like Goal or Save. */
  banner: z.string().max(24).nullable(),
});

export const BUZZ_KINDS = ["kick", "pass", "ball", "tackle", "tackled", "goal", "conceded", "whistle", "win", "lose"] as const;
export type BuzzKind = (typeof BUZZ_KINDS)[number];

/** Asks a phone to buzz, on hardware that allows it. */
export const buzzSchema = z.object({ kind: z.literal("buzz"), event: z.enum(BUZZ_KINDS) });

export const hostMessageSchema = z.discriminatedUnion("kind", [phoneStateSchema, buzzSchema]);

export type PhoneState = z.infer<typeof phoneStateSchema>;
export type HostMessage = z.infer<typeof hostMessageSchema>;
