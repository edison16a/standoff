import { z } from "zod";
import { ROLES } from "../roles";
import { CHARACTER_IDS } from "../roster";

/** Where the room is, as a phone sees it: the lobby, one of the match's phases, or the touchdown replay. */
export const PHASES = ["lobby", "choose", "presnap", "live", "kick", "dead", "touchdown", "convert", "over", "replay"] as const;
export type RoomPhase = (typeof PHASES)[number];

/** Which controls the phone shows. See engine/status.ts. */
export const PADS = ["qb", "runner", "defense", "kicker", "choose", "wait"] as const;
export const CALLS = ["throw", "kick", "two"] as const;

const team = z.union([z.literal(0), z.literal(1)]);
const count = z.number().int().min(0).max(999);

/** A player's line on the results: yards passing, running and catching, touchdowns, tackles and picks. */
export const statLineSchema = z.object({
  passYards: z.number().int().min(-999).max(9999),
  rushYards: z.number().int().min(-999).max(9999),
  recYards: z.number().int().min(-999).max(9999),
  touchdowns: count,
  tackles: count,
  interceptions: count,
});

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
  role: z.enum(ROLES).nullable(),
  /** False for a phone that joined mid match and waits for the next one. */
  playing: z.boolean(),
  score: z.tuple([count, count]),
  quarter: z.number().int().min(1).max(9),
  overtime: z.boolean(),
  /** Whole seconds left in the quarter. */
  clock: count,
  /** Down and distance, like "3rd and 4". */
  down: z.string().max(24),
  /** This player's side has the ball. */
  offense: z.boolean(),
  pad: z.enum(PADS),
  /** The QB's pick before a play, and the whole seconds left to make it. */
  choose: z.object({ options: z.array(z.enum(CALLS)).max(2), left: count }).nullable(),
  /** Whole seconds left to hike, for the QB before the snap. */
  hikeLeft: count.nullable(),
  /** The kick meter this phone stops, and whether it is a field goal or a punt. */
  meter: z.object({ stage: z.enum(["aim", "power"]), fieldGoal: z.boolean() }).nullable(),
  withBall: z.boolean(),
  canThrow: z.boolean(),
  jukeReady: z.boolean(),
  rushReady: z.boolean(),
  guarding: z.boolean(),
  /** On the ground: every button waits until the player is up. */
  grounded: z.boolean(),
  /** A word for the moment, like Touchdown or First down, for the phone's status line. */
  banner: z.string().max(24).nullable(),
  /** During a touchdown replay: whether this player pressed to skip it, and how many of everyone have. */
  skip: z.object({ agreed: z.boolean(), count: z.number().int().min(0).max(6), total: z.number().int().min(0).max(6) }).nullable(),
  /** Set at the final whistle for players in the match. */
  result: z.enum(["win", "lose", "tie"]).nullable(),
  stats: statLineSchema.nullable(),
});

export const BUZZ_KINDS = ["hike", "throw", "catch", "tackle", "tackled", "touchdown", "conceded", "whistle", "kick", "pick", "win", "lose"] as const;
export type BuzzKind = (typeof BUZZ_KINDS)[number];

/** Asks a phone to buzz, on hardware that allows it. */
export const buzzSchema = z.object({ kind: z.literal("buzz"), event: z.enum(BUZZ_KINDS) });

export const hostMessageSchema = z.discriminatedUnion("kind", [phoneStateSchema, buzzSchema]);

export type PhoneState = z.infer<typeof phoneStateSchema>;
export type StatLine = z.infer<typeof statLineSchema>;
export type HostMessage = z.infer<typeof hostMessageSchema>;
export type PadKind = (typeof PADS)[number];
export type Call = (typeof CALLS)[number];
