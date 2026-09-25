import { z } from "zod";
import { NAME_MAX } from "@/platform/profile";
import { GUN_IDS } from "../engine/guns";
import { RULES } from "../engine/tuning";
import { CHARACTER_IDS } from "../roster";

/** Where the room is, as a phone sees it. */
export const PHASES = ["lobby", "calibrate", "match", "results"] as const;
export type RoomPhase = (typeof PHASES)[number];

export const MODES = ["1v1", "2v2"] as const;
export type Mode = (typeof MODES)[number];

const score = z.number().int().min(0).max(RULES.roundsToWin);

/**
 * Everything one phone needs to draw its screen. The host sends each
 * phone its own copy whenever something on it changed, rather than
 * patches, because it is small and a phone that reconnects mid match is
 * then instantly up to date.
 */
export const phoneStateSchema = z.object({
  kind: z.literal("state"),
  phase: z.enum(PHASES),
  mode: z.enum(MODES),
  /** This player's side, 0 or 1, or null before the teams are set. */
  team: z.number().int().min(0).max(1).nullable(),
  teammate: z.string().max(NAME_MAX + 8).nullable(),
  gun: z.enum(GUN_IDS).nullable(),
  character: z.enum(CHARACTER_IDS).nullable(),
  ready: z.boolean(),
  /** False for a phone that joined mid match and waits for the next one. */
  playing: z.boolean(),
  health: z.number().min(0).max(RULES.health),
  alive: z.boolean(),
  ammo: z.number().int().min(0).max(99),
  magazine: z.number().int().min(1).max(99),
  reloading: z.boolean(),
  /** Seconds the running reload has left, for the progress ring. */
  reloadLeft: z.number().min(0).max(10),
  round: z.number().int().min(0).max(RULES.roundsToWin * 2),
  /** Round wins: this player's side first. */
  score: z.tuple([score, score]),
  kills: z.number().int().min(0).max(999),
  /** Set once the match is decided. */
  won: z.boolean().nullable(),
  /** A word for the moment, like Round 3 or Fight. */
  banner: z.string().max(24).nullable(),
});

export const BUZZ_KINDS = ["hit", "head", "kill", "hurt", "down", "dry", "reloaded", "win", "lose"] as const;
export type BuzzKind = (typeof BUZZ_KINDS)[number];

/** Asks a phone to buzz, on hardware that allows it. */
export const buzzSchema = z.object({ kind: z.literal("buzz"), event: z.enum(BUZZ_KINDS) });

export const hostMessageSchema = z.discriminatedUnion("kind", [phoneStateSchema, buzzSchema]);

export type PhoneState = z.infer<typeof phoneStateSchema>;
export type HostMessage = z.infer<typeof hostMessageSchema>;
