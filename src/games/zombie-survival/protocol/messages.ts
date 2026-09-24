import { z } from "zod";
import { NAME_MAX } from "@/platform/profile";
import { PHASES } from "../engine/events";
import { WEAPON_IDS } from "../engine/weapons";

/**
 * Everything the host and phones say to each other, apart from the aim
 * kit's own messages (whose kinds start with "aim"). Phones send choices
 * and button presses. The host sends back what each screen should show.
 */

const weaponSchema = z.enum(WEAPON_IDS);

/** Phone to host. */
export const phoneMessageSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("weapon"), weapon: weaponSchema }),
  z.object({ kind: z.literal("ready"), ready: z.boolean() }),
  z.object({ kind: z.literal("reload") }),
  z.object({ kind: z.literal("retry") }),
  /** After the escape, back to the weapon pick for another run. */
  z.object({ kind: z.literal("again") }),
]);
export type PhoneMessage = z.infer<typeof phoneMessageSchema>;

const seatSchema = z.object({
  name: z.string().max(NAME_MAX + 8),
  weapon: weaponSchema.nullable(),
  ready: z.boolean(),
  connected: z.boolean(),
  /** Playing in the current run. */
  playing: z.boolean(),
});
export type SeatView = z.infer<typeof seatSchema>;

/** The whole picture every phone draws from. Sent fresh when anything changes. */
export const stateSchema = z.object({
  kind: z.literal("state"),
  phase: z.enum(PHASES),
  stage: z.number().int().min(1),
  stageTitle: z.string().max(60),
  objective: z.string().max(80),
  health: z.number().min(0),
  maxHealth: z.number().min(1),
  seats: z.array(seatSchema).max(4),
});
export type StateMessage = z.infer<typeof stateSchema>;

/** One player's gun, sent to that player whenever it changes. */
export const gunSchema = z.object({
  kind: z.literal("gun"),
  weapon: weaponSchema,
  ammo: z.number().int().min(0),
  magazine: z.number().int().min(1),
  reloading: z.boolean(),
  /** Seconds the running reload has left, for the progress bar. */
  reloadLeft: z.number().min(0),
});
export type GunMessage = z.infer<typeof gunSchema>;

/** One player's own numbers, for their phone. */
export const scoreSchema = z.object({
  kind: z.literal("score"),
  kills: z.number().int().min(0),
  accuracy: z.number().min(0).max(1),
  headshots: z.number().int().min(0),
  weakHits: z.number().int().min(0),
});
export type ScoreMessage = z.infer<typeof scoreSchema>;

export const BUZZ_EVENTS = ["hit", "kill", "weak", "hurt", "dry", "reloaded"] as const;
export type BuzzEvent = (typeof BUZZ_EVENTS)[number];

/** Asks a phone to vibrate, on hardware that allows it. */
export const buzzSchema = z.object({ kind: z.literal("buzz"), event: z.enum(BUZZ_EVENTS) });

export const hostMessageSchema = z.discriminatedUnion("kind", [stateSchema, gunSchema, scoreSchema, buzzSchema]);
export type HostMessage = z.infer<typeof hostMessageSchema>;
