import { z } from "zod";
import { NAME_MAX } from "../profile";
import { MAX_SEATS } from "./envelopes";

/**
 * The two payloads the platform itself sends inside a room, which games
 * never see (see RESERVED_KINDS). A phone says what its player is called,
 * and the host tells every phone who is in the room.
 */

export const profileSchema = z.object({ kind: z.literal("profile"), name: z.string().min(1).max(NAME_MAX) });

export const playersSchema = z.object({
  kind: z.literal("players"),
  players: z
    .array(z.object({ seat: z.number().int().min(1).max(MAX_SEATS), name: z.string().max(NAME_MAX), connected: z.boolean() }))
    .max(MAX_SEATS),
});
