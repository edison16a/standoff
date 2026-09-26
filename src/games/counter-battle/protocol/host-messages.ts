import { z } from "zod";
import { NAME_MAX } from "@/platform/profile";
import { GUN_IDS } from "../engine/guns";
import { RULES } from "../engine/tuning";
import { CHARACTER_IDS } from "../roster";

/** Where the room is, as a phone sees it. */
export const PHASES = ["lobby", "match", "results"] as const;
export type RoomPhase = (typeof PHASES)[number];

export const MODES = ["1v1", "2v2"] as const;
export type Mode = (typeof MODES)[number];

/** The most rounds a phone is told about. Draws can run a match longer; the host clamps the number. */
export const ROUND_MAX = RULES.roundsToWin * 2;

const score = z.number().int().min(0).max(RULES.roundsToWin);
const share = z.number().min(0).max(1);

/** A player's view on the big screen, as fractions from the top left, which is where they calibrate and aim. */
export const zoneSchema = z.object({ x: share, y: share, w: share, h: share });

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
  /** This player's side, 0 or 1, or null while there is no place for them. */
  team: z.union([z.literal(0), z.literal(1)]).nullable(),
  teammate: z.string().max(NAME_MAX + 8).nullable(),
  /** This player's view on the big screen, or null for the whole screen. */
  zone: zoneSchema.nullable(),
  /** The gun the host has for this player. */
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
  /** Seconds the running reload has left, for the progress bar. */
  reloadLeft: z.number().min(0).max(10),
  /** The fight is on, so the trigger works. */
  armed: z.boolean(),
  round: z.number().int().min(0).max(ROUND_MAX),
  /** Round wins: this player's side first. */
  score: z.tuple([score, score]),
  kills: z.number().int().min(0).max(999),
  deaths: z.number().int().min(0).max(999),
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
export type Zone = z.infer<typeof zoneSchema>;
