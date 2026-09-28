import { z } from "zod";
import { CHARACTER_IDS } from "../roster";

/** Where the room is, as a phone sees it. The replay of the winning basket comes between the win and the results. */
export const PHASES = ["lobby", "countdown", "live", "replay", "over"] as const;
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
  /** On defence with the ball there to reach for, so the third button is Steal. */
  canSteal: z.boolean(),
  /** Close enough that a swipe would get there. */
  stealReach: z.boolean(),
  /** The other team has the ball: Shoot is Guard and Pass is Block. */
  defending: z.boolean(),
  /** Guard held and shadowing (on), held but too far from the man (far), or not held. */
  guard: z.enum(["off", "on", "far"]),
  /**
   * Free throws after a foul: whether this player shoots them, which one
   * is next of how many, and whether the shooter is set at the line.
   */
  freeThrow: z.object({ mine: z.boolean(), n: z.number().int().min(1).max(3), of: z.number().int().min(1).max(3), ready: z.boolean() }).nullable(),
  /** The shot meter for this player: where the green sits and how wide it is, in milliseconds. */
  meter: z.object({ fullMs: z.number(), greenMs: z.number(), halfMs: z.number() }),
  onFire: z.boolean(),
  /** The ball is being checked at the top; play starts when it is back with the checker. */
  checking: z.boolean(),
  countdown: z.number().int().min(0).max(9).nullable(),
});

/** The replay's skip vote: it is skipped only once every player in the game has pressed a button. */
export const replaySchema = z.object({
  voted: z.boolean(),
  votes: z.array(z.object({ name: z.string().max(40), done: z.boolean() })).max(6),
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
  /** During the replay: whether this phone has asked to skip it, and who else has. */
  replay: replaySchema.nullable(),
  /** At the end: whether this player's team won, and their line. */
  result: z
    .object({ won: z.boolean(), points: z.number().int(), rebounds: z.number().int(), assists: z.number().int(), steals: z.number().int(), blocks: z.number().int() })
    .nullable(),
});

export const BUZZ_KINDS = ["ball", "shot", "green", "score", "dunk", "blocked", "stolen", "block", "steal", "whistle", "win", "lose", "call"] as const;
export type BuzzKind = (typeof BUZZ_KINDS)[number];

/** Asks a phone to buzz and flash a word, like "Green!" or "Stolen!". */
export const buzzSchema = z.object({ kind: z.literal("buzz"), event: z.enum(BUZZ_KINDS), text: z.string().max(24).nullable() });

export const hostMessageSchema = z.discriminatedUnion("kind", [phoneStateSchema, buzzSchema]);

export type PhoneState = z.infer<typeof phoneStateSchema>;
export type CourtState = z.infer<typeof courtSchema>;
export type HostMessage = z.infer<typeof hostMessageSchema>;
