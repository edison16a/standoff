import { z } from "zod";
import { CHARACTER_IDS } from "../characters";
import { ITEM_KINDS } from "../engine/items";
import { TRACK_IDS } from "../tracks";

/** Where the room is, as the phones see it. */
export const PHASES = ["lobby", "countdown", "racing", "results"] as const;
export type Phase = (typeof PHASES)[number];

export const EFFECT_KINDS = ["stun", "ice", "ghost", "shield", "boost"] as const;
export type EffectKind = (typeof EFFECT_KINDS)[number];

/**
 * Everything one phone needs to draw its screen. The host sends each
 * phone its own copy whenever something on it changed, rather than
 * patches, because it is small and a phone that reconnects mid race is
 * then instantly up to date.
 */
export const phoneStateSchema = z.object({
  kind: z.literal("state"),
  phase: z.enum(PHASES),
  map: z.enum(TRACK_IDS),
  /** Drivers other players already have. */
  taken: z.array(z.enum(CHARACTER_IDS)),
  /** This player's driver and ready flag, as the host has them. */
  pick: z.enum(CHARACTER_IDS).nullable(),
  ready: z.boolean(),
  /** False for a phone that joined mid race and waits for the next one. */
  racing: z.boolean(),
  countdown: z.number().int().min(0).max(9).nullable(),
  place: z.number().int().min(1).max(8).nullable(),
  karts: z.number().int().min(0).max(8),
  lap: z.number().int().min(0).max(9),
  laps: z.number().int().min(1).max(9),
  item: z.enum(ITEM_KINDS).nullable(),
  /** The item roulette is still spinning. */
  rolling: z.boolean(),
  wrongWay: z.boolean(),
  finished: z.boolean(),
  effect: z.enum(EFFECT_KINDS).nullable(),
  /** How much extra pace holding Drive has built, 0 to 1, in tenths. */
  surge: z.number().min(0).max(1),
  /** The drift's spark colour, 0 fresh to 3 purple, or null when not drifting. */
  drift: z.number().int().min(0).max(3).nullable(),
});

export const BUZZ_KINDS = ["hit", "pickup", "boost", "lap", "bump", "finish"] as const;
export type BuzzKind = (typeof BUZZ_KINDS)[number];

/** Asks a phone to buzz, on hardware that allows it. */
export const buzzSchema = z.object({ kind: z.literal("buzz"), event: z.enum(BUZZ_KINDS) });

export const hostMessageSchema = z.discriminatedUnion("kind", [phoneStateSchema, buzzSchema]);

export type PhoneState = z.infer<typeof phoneStateSchema>;
export type HostMessage = z.infer<typeof hostMessageSchema>;
