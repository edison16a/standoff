import { z } from "zod";

/**
 * The outer layer every frame is wrapped in. The relay reads the envelope
 * to decide who it is from and where it goes. It never looks inside a
 * game's payload beyond its `kind`, so a new game can invent any messages
 * it likes without touching the relay. Each game validates its own.
 */

export const ROOM_CODE_LENGTH = 4;
/** Letters only, and none that are easy to misread on a phone screen. */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ";
/** The most phones one room seats. Team games like 3 on 3 need six. */
export const MAX_SEATS = 6;

/** A player's place in the room, from 1. Join order decides it. */
export type Seat = number;

const roomCode = z
  .string()
  .length(ROOM_CODE_LENGTH)
  .transform((code) => code.toUpperCase());
const token = z.string().min(16).max(64);
const seat = z.number().int().min(1).max(MAX_SEATS);
export const gameIdSchema = z.string().regex(/^[a-z0-9-]{1,32}$/);

/** Any game message: an object with a short `kind`. The relay's size cap bounds the rest. */
export const payloadSchema = z.object({ kind: z.string().min(1).max(32) }).passthrough();
export type Payload = z.infer<typeof payloadSchema>;

/* Client to server */

export const clientEnvelopeSchema = z.discriminatedUnion("type", [
  /** The computer opening a new room for a game, with this many seats. */
  z.object({ type: z.literal("host:create"), game: gameIdSchema, seats: seat }),
  /** The computer reclaiming its room after a page reload. */
  z.object({ type: z.literal("host:resume"), code: roomCode, token }),
  /** The computer ending the game for good. */
  z.object({ type: z.literal("host:close") }),
  /** The computer talking to one phone or all of them. */
  z.object({ type: z.literal("host:send"), to: z.union([seat, z.literal("all")]), payload: payloadSchema }),
  /** A phone joining, or rejoining with the token it was given last time. */
  z.object({ type: z.literal("phone:join"), code: roomCode, token: token.optional() }),
  /** A phone talking to the host. */
  z.object({ type: z.literal("phone:send"), payload: payloadSchema }),
]);

export type ClientEnvelope = z.infer<typeof clientEnvelopeSchema>;

/* Server to client */

/** `unavailable` is a server side failure, worth retrying on a fresh connection. */
export type JoinErrorReason = "not-found" | "full" | "closed" | "unavailable";

/** What every client learns about the room it is in. */
export interface RoomInfo {
  code: string;
  game: string;
  seats: number;
}

/**
 * `sharedRooms` is false when the server runs on several instances but has
 * no shared store (a Vercel deploy without Redis), where phones may land on
 * an instance that has never heard of the room.
 */
export type ServerEnvelope =
  | ({ type: "room:created"; token: string; joinUrl: string; sharedRooms: boolean } & RoomInfo)
  | ({ type: "room:resumed"; joinUrl: string; connected: boolean[]; sharedRooms: boolean } & RoomInfo)
  | { type: "room:error"; reason: JoinErrorReason }
  | { type: "peer:joined"; seat: Seat; rejoined: boolean }
  | { type: "peer:left"; seat: Seat }
  | { type: "peer:message"; seat: Seat; payload: Payload }
  /** `hostHere` settles the "host away" state afresh, in case a notice was missed while offline. */
  | ({ type: "phone:joined"; seat: Seat; token: string; hostHere: boolean } & RoomInfo)
  | { type: "host:message"; payload: Payload }
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
