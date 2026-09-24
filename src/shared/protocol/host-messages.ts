import { z } from "zod";
import { CHARACTER_IDS } from "../characters";
import type { Tuning } from "../tuning";
import { MATCH_PHASES } from "./phase";

/** Messages the host sends to one phone or both. */

const slotSchema = z.union([z.literal(1), z.literal(2)]);
const pair = <T extends z.ZodType>(item: T) => z.tuple([item, item]);

/**
 * Everything a phone needs to draw its screen. The host sends a fresh copy
 * whenever something changes rather than patches, because it is small and
 * a phone that reconnects mid match is then instantly up to date.
 */
export const controllerStateSchema = z.object({
  kind: z.literal("state"),
  phase: z.enum(MATCH_PHASES),
  scores: pair(z.number().int().min(0)),
  touchesToWin: z.number().int().min(1),
  picks: pair(z.enum(CHARACTER_IDS).nullable()),
  ready: pair(z.boolean()),
  connected: pair(z.boolean()),
  /** Seats played by the computer. */
  computer: pair(z.boolean()),
  /** Whole seconds left in the en garde countdown, when counting. */
  countdown: z.number().int().min(0).nullable(),
  skipVotes: pair(z.boolean()),
  rematchVotes: pair(z.boolean()),
  /** Short referee call for the last exchange, like "Touch" or "Parried". */
  call: z.string().max(40).nullable(),
  winner: slotSchema.nullable(),
});

/** Every tunable value, validated loosely here and clamped on arrival. */
export const tuningMessageSchema = z.object({
  kind: z.literal("tuning"),
  tuning: z.object({
    jabThreshold: z.number(),
    parryThreshold: z.number(),
    parryWindowMs: z.number(),
    refractoryMs: z.number(),
    replayTimeoutMs: z.number(),
    musicVolume: z.number(),
    crowdVolume: z.number(),
    sfxVolume: z.number(),
    cheerCooldownMs: z.number(),
  }),
});

/** Tells a phone to zero its tracked position at the start of an exchange. */
export const recenterSchema = z.object({ kind: z.literal("recenter") });

/** Asks a phone to buzz, on hardware that allows it. */
export const feedbackSchema = z.object({
  kind: z.literal("feedback"),
  event: z.enum(["touched", "scored", "parried", "blocked"]),
});

export const hostMessageSchema = z.discriminatedUnion("kind", [
  controllerStateSchema,
  tuningMessageSchema,
  recenterSchema,
  feedbackSchema,
]);

export type ControllerState = z.infer<typeof controllerStateSchema>;
export type FeedbackEvent = z.infer<typeof feedbackSchema>["event"];
export type HostMessage = z.infer<typeof hostMessageSchema>;

/** Fails to compile if the wire schema and the Tuning type drift apart. */
type WireTuning = z.infer<typeof tuningMessageSchema>["tuning"];
type SameKeys<A, B> = [keyof A] extends [keyof B] ? ([keyof B] extends [keyof A] ? true : false) : false;
export const TUNING_SCHEMA_MATCHES: SameKeys<WireTuning, Tuning> = true;
