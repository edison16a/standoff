import { z } from "zod";
import { hostMessageSchema } from "./host-messages";
import { phoneMessageSchema } from "./phone-messages";

/**
 * The outer layer every WebSocket frame is wrapped in. The server reads
 * the envelope to decide who it is from and where it goes, and never looks
 * inside the game payload beyond validating it.
 */

export const ROOM_CODE_LENGTH = 4;
/** Letters only, and none that are easy to misread on a phone screen. */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ";

const roomCode = z
  .string()
  .length(ROOM_CODE_LENGTH)
  .transform((code) => code.toUpperCase());
const token = z.string().min(16).max(64);
const slot = z.union([z.literal(1), z.literal(2)]);

/* Client to server */

export const clientEnvelopeSchema = z.discriminatedUnion("type", [
  /** The computer opening a new room. */
  z.object({ type: z.literal("host:create") }),
  /** The computer reclaiming its room after a page reload. */
  z.object({ type: z.literal("host:resume"), code: roomCode, token }),
  /** The computer ending the game for good. */
  z.object({ type: z.literal("host:close") }),
  /** The computer talking to one phone or both. */
  z.object({ type: z.literal("host:send"), to: z.union([slot, z.literal("all")]), payload: hostMessageSchema }),
  /** A phone joining, or rejoining with the token it was given last time. */
  z.object({ type: z.literal("phone:join"), code: roomCode, token: token.optional() }),
  /** A phone talking to the host. */
  z.object({ type: z.literal("phone:send"), payload: phoneMessageSchema }),
]);

export type ClientEnvelope = z.infer<typeof clientEnvelopeSchema>;

/* Server to client */

/** `unavailable` is a server side failure, worth retrying on a fresh connection. */
export type JoinErrorReason = "not-found" | "full" | "closed" | "unavailable";

/**
 * `sharedRooms` is false when the server runs on several instances but has
 * no shared store (a Vercel deploy without Redis). Phones may then land on
 * an instance that has never heard of the room, so the host warns about it.
 */
export type ServerEnvelope =
  | { type: "room:created"; code: string; token: string; joinUrl: string; sharedRooms: boolean }
  | { type: "room:resumed"; code: string; joinUrl: string; connected: [boolean, boolean]; sharedRooms: boolean }
  | { type: "room:error"; reason: JoinErrorReason }
  | { type: "peer:joined"; slot: 1 | 2; rejoined: boolean }
  | { type: "peer:left"; slot: 1 | 2 }
  | { type: "peer:message"; slot: 1 | 2; payload: z.infer<typeof phoneMessageSchema> }
  /** `hostHere` settles the "host away" state afresh, in case a notice was missed while offline. */
  | { type: "phone:joined"; code: string; slot: 1 | 2; token: string; hostHere: boolean }
  | { type: "host:message"; payload: z.infer<typeof hostMessageSchema> }
  | { type: "host:away" }
  | { type: "host:back" }
  | { type: "room:closed" }
  /**
   * This socket is about to hit the server's time limit. The client should
   * open a new one and rejoin on it before this one is cut.
   */
  | { type: "server:rotate" };

/**
 * Where every client connects. It sits under /api because on Vercel the
 * socket is served by a route handler at this path, and the local server
 * answers the same path so the client never needs to know which it has.
 */
export const SOCKET_PATH = "/api/ws";

/** The HTTP fallback for when a WebSocket cannot open. GET streams events down, POST sends up. */
export const STREAM_PATH = "/api/stream";
