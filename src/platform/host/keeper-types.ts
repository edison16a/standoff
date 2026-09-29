import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import type { RememberedRoom } from "./room-memory";

export type Send = (message: ClientEnvelope) => void;
export type RoomMessage = Extract<ServerEnvelope, { type: "room:created" | "room:resumed" | "room:error" | "room:retired" }>;
export type CreateFailure = "timeout" | "limit" | "unavailable";

export interface OpenedRoom extends RememberedRoom {
  joinUrl: string;
  sharedRooms: boolean;
  /** Which seats already have a phone, and their names. Only known when resuming. */
  connected: boolean[] | null;
  names: (string | null)[] | null;
}

export interface RoomKeeperEvents {
  opened(room: OpenedRoom): void;
  /** A resume failed and is being tried again, so the room may be gone: its code should hide meanwhile. */
  doubt?(): void;
  /** The room is gone for good. `old` is what was remembered, so it can be made again. */
  lost(info: { old: RememberedRoom | null }): void;
  /** A create never got its room. */
  failed(reason: CreateFailure): void;
}

/** The connection a keeper talks through: the current socket, and a way to get a fresh one. */
export interface KeeperLink {
  send: Send;
  redial(): void;
}
