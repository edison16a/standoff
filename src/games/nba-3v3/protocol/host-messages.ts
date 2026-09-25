import { z } from "zod";
import { CHARACTER_IDS } from "../roster";

/** Where the room is, as a phone sees it. */
export const PHASES = ["lobby", "countdown", "live", "over"] as const;
export type Phase = (typeof PHASES)[number];

const team = z.union([z.literal(0), z.literal(1)]);

/** What the phone's controller shows while this player is in the game. */
export const courtSchema = z.object({
  team,
  score: z.tuple([z.number().int().min(0).max(99), z.number().int().min(0).max(99)]),
  shotClock: z.number().int().min(0).max(24),
  /** This player has the ball. */
  hasBall: z.boolean(),
  /** This player's team has the ball. */
  attacking: z.boolean(),
  /** Who has the ball, by name, or null when it is loose. */
  holder: z.string().max(40).nullable(),
  /** The team must take the ball back past the arc before it can score. */
  mustClear: z.boolean(),
  /** Close enough to the ball on defence that the button swipes. */
  canSteal: z.boolean(),
  /**
   * Free throws after a foul: whether this player shoots them, which of
   * the two is next, and whether the shooter is set at the line.
   */
  freeThrow: z.object({ mine: z.boolean(), n: z.union([z.literal(1), z.literal(2)]), ready: z.boolean() }).nullable(),
  /** The shot meter for this player: where the green sits and how wide it is, in milliseconds. */
  meter: z.object({ fullMs: z.number(), greenMs: z.number(), halfMs: z.number() }),
  onFire: z.boolean(),
  /** The ball is being checked at the top; play starts when it is back with the checker. */
  checking: z.boolean(),
  countdown: z.number().int().min(0).max(9).nullable(),
});

export const phoneStateSchema = z.object({
  kind: z.literal("state"),
  phase: z.enum(PHASES),
  /** Characters other players already have. */
  taken: z.array(z.enum(CHARACTER_IDS)),
  pick: z.enum(CHARACTER_IDS).nullable(),
  ready: z.boolean(),
  /** The team the host has put this player on, or null. */
  team: team.nullable(),
  /** In the game being played, rather than waiting for the next one. */
  playing: z.boolean(),
  court: courtSchema.nullable(),
  /** At the end: whether this player's team won, and their line. */
  result: z.object({ won: z.boolean(), points: z.number().int(), rebounds: z.number().int(), assists: z.number().int() }).nullable(),
});

export const BUZZ_KINDS = ["ball", "shot", "green", "score", "dunk", "blocked", "stolen", "block", "steal", "whistle", "win", "lose", "call"] as const;
export type BuzzKind = (typeof BUZZ_KINDS)[number];

/** Asks a phone to buzz and flash a word, like "Green!" or "Stolen!". */
export const buzzSchema = z.object({ kind: z.literal("buzz"), event: z.enum(BUZZ_KINDS), text: z.string().max(24).nullable() });

export const hostMessageSchema = z.discriminatedUnion("kind", [phoneStateSchema, buzzSchema]);

export type PhoneState = z.infer<typeof phoneStateSchema>;
export type CourtState = z.infer<typeof courtSchema>;
export type HostMessage = z.infer<typeof hostMessageSchema>;
