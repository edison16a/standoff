import { create } from "zustand";
import type { Player } from "@/platform/games/game-api";
import type { SocketStatus } from "@/platform/net/socket-client";

export type HostScreen = "home" | "room";

/**
 * Whether phones can reach the room: being checked, passed, being made
 * again, or lost, which asks the player to make a new one. Idle with no room.
 */
export type RoomHealth = "idle" | "checking" | "ok" | "fixing" | "lost";

/**
 * Why the room needs remaking: the server lost it, phones cannot reach it,
 * its server is about to go and the room cannot move with it, or a new
 * room could not be made.
 */
export type RoomProblem = "lost" | "unreachable" | "ending" | "not-made";

export interface OpenRoom {
  code: string;
  joinUrl: string;
  game: string;
  seats: number;
}

/**
 * What the platform's host screens render: the connection, and the open
 * room with who is in it. Each game keeps its own store for everything
 * inside the game.
 */
export interface HostState {
  screen: HostScreen;
  status: SocketStatus;
  room: OpenRoom | null;
  players: Player[];
  /** The game has started, so the join code tucks away. */
  playing: boolean;
  error: string | null;
  /** A reload is getting its room back. */
  resuming: boolean;
  health: RoomHealth;
  problem: RoomProblem | null;
  /** The server no longer has the room at all, so there is nothing to keep. */
  roomGone: boolean;
  /** A room is on its way, so Host Game waits. */
  opening: boolean;
  /** The game keeps its join code hidden, so there is nothing to check yet. */
  joinHidden: boolean;
}

export const useHostStore = create<HostState>(() => ({
  screen: "home",
  status: "connecting",
  room: null,
  players: [],
  playing: false,
  error: null,
  resuming: false,
  health: "idle",
  problem: null,
  roomGone: false,
  opening: false,
  joinHidden: false,
}));
