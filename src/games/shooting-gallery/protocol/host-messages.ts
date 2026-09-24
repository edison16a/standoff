import { z } from "zod";
import { NAME_MAX } from "@/platform/profile";
import { MAX_SEATS } from "@/platform/protocol";
import { TARGET_KINDS } from "../engine/kinds";
import { SETUP_STEPS } from "./phone-messages";

/** What the whole game is doing. The host owns it, the phones mirror it. */
export const GALLERY_PHASES = ["lobby", "countdown", "playing", "results"] as const;
export type GalleryPhase = (typeof GALLERY_PHASES)[number];

const seat = z.number().int().min(1).max(MAX_SEATS);
const count = z.number().int().min(0);

/** One player as every phone sees them. */
export const playerViewSchema = z.object({
  seat,
  name: z.string().max(NAME_MAX * 2),
  connected: z.boolean(),
  step: z.enum(SETUP_STEPS).nullable(),
  ready: z.boolean(),
  /** Playing the current round. Late joiners wait for the next one. */
  inRound: z.boolean(),
  score: count,
  shots: count,
  hits: count,
  /** Place in the round, from 1, once there are scores to rank. */
  place: count,
  /** Where this round's score landed in the high score table, if it did. */
  best: count.nullable(),
});
export type PlayerView = z.infer<typeof playerViewSchema>;

/**
 * Everything a phone draws. The host sends a fresh copy whenever it
 * changes rather than patches, because it is small and a phone that
 * reconnects is then instantly up to date.
 */
export const stateSchema = z.object({
  kind: z.literal("state"),
  phase: z.enum(GALLERY_PHASES),
  /** The round length the host picked. */
  seconds: count,
  /** Whole seconds of shooting left. */
  timeLeft: count,
  /** Whole seconds of countdown left, 0 when not counting. */
  countdown: count,
  players: z.array(playerViewSchema).max(MAX_SEATS),
  winners: z.array(seat),
});
export type GalleryState = z.infer<typeof stateSchema>;

/** Tells a shooter what their shot hit, for a buzz and a flash of points. */
export const scoredSchema = z.object({
  kind: z.literal("scored"),
  points: count,
  target: z.enum(TARGET_KINDS),
  bull: z.boolean(),
});
export type Scored = z.infer<typeof scoredSchema>;

export const hostMessageSchema = z.discriminatedUnion("kind", [stateSchema, scoredSchema]);
export type HostMessage = z.infer<typeof hostMessageSchema>;
